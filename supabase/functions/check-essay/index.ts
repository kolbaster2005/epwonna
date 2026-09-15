// supabase/functions/check-essay/index.ts
//
// Проверяет сочинение (essay_choice) через Gemini и сохраняет результат
// в essay_ai_reviews. Вызывается с фронтенда как:
//   POST /functions/v1/check-essay   { questionId: string, testId: string }
//   Authorization: Bearer <user JWT>  (supabase-js добавляет сам)
//
// testId обязателен: одно и то же задание может быть привязано к
// нескольким разным пробникам через test_tasks (банк переиспользуется),
// поэтому сочинение и его проверка ищутся и сохраняются по паре
// (questionId, testId) — иначе решив задание в одном пробнике, человек
// видел бы тот же текст и ту же проверку в любом другом пробнике с тем
// же заданием.
//
// Ничего секретного клиенту не передаётся и не запрашивается — функция
// сама читает вопрос и сочинение пользователя из БД (используя его же
// JWT, так что RLS не даёт прочитать чужое сочинение), строит промпт,
// зовёт Gemini своим GEMINI_API_KEY и пишет результат сервисным ключом
// (у обычных пользователей нет права писать в essay_ai_reviews напрямую).
//
// Секреты, которые должны быть выставлены в Supabase:
//   supabase secrets set GEMINI_API_KEY=...
// SUPABASE_URL / SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY
// прокидываются в Edge Functions автоматически, вручную задавать не нужно.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY')
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
// gemini-1.5-flash отключена Google полностью. gemini-2.5-flash тоже
// уходит на покой в октябре 2026 — не берём и её. gemini-3.5-flash —
// стабильная модель линейки Gemini 3, без предупреждений об отключении
// на момент написания (сентябрь 2026). Актуальный список моделей:
// https://ai.google.dev/gemini-api/docs/models
const GEMINI_MODEL = 'gemini-3.5-flash'
// Резервная модель — если основная перегружена (503) даже после
// повторов, пробуем её. У разных моделей на бесплатном тарифе Gemini
// независимая ёмкость на серверах Google, так что одна может быть
// перегружена, пока другая свободна.
const GEMINI_FALLBACK_MODEL = 'gemini-3.5-flash-lite'
const MIN_WORDS = 30
// Бесплатный тариф Gemini ограничен по запросам в день на весь
// проект — лимит на пользователя защищает и от того, что один человек
// исчерпает квоту для всех, и стимулирует заходить каждый день, а не
// потратить всё за раз. Легко поменять в одном месте, когда будет
// понятно по реальному трафику, что 2 — мало или много.
const DAILY_LIMIT = 2
// Держим в синхроне со списком в src/contexts/AuthContext.jsx и
// supabase/functions/generate-practice-test/index.ts — pro-пользователи
// (пока только сам разработчик) не упираются в дневной лимит проверок.
const PRO_EMAILS = ['maksimmissuragin@gmail.com']

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

function wordCount(text: string) {
  return text.trim().split(/\s+/).filter(Boolean).length
}

// ---------------------------------------------------------------------
// Промпт: язык и критерии зависят от exam_key и от того, какую тему
// (choice_title) выбрал студент. EPD объединяет до двух тем
// (Stellungnahme / Grafikinterpretation) в одном essay_choice —
// поэтому смотрим именно choice_title конкретного сочинения, а не
// task_type всего вопроса (который может быть "A/B" сразу).
// ---------------------------------------------------------------------

type PromptInput = {
  examKey: string
  choiceTitle: string
  taskText: string
  instructions: string[]
  stimulusText: string | null
  studentText: string
  wordCountValue: number
}

// Официальные критерии EPD Schreiben (25 Punkte gesamt) — присланы
// пользователем напрямую, не мой черновик. Одна и та же рубрика для
// ОБОИХ типов задания (Stellungnahme и Grafikinterpretation) — баллы
// и категории не различаются, разница только в том, что засчитывается
// как "Erfüllung der Aufgabe" внутри Inhalt (см. ниже).
const EPD_SCHREIBEN_RUBRIC = `Offizielle Bewertungskriterien (insgesamt 25 Punkte), gelten für Stellungnahme und Grafikinterpretation gleichermaßen:

- Inhalt (5 Punkte): Erfüllung der Aufgabe, Informationsdichte, Argumentation.
- Aufbau (6 Punkte): Textstruktur, Textkohärenz, Angemessenheit der Textsorte.
- Wortschatz (6 Punkte): Idiomatik, Textadäquatheit, Varianz, Treffsicherheit.
- Sprachrichtigkeit (8 Punkte): Morphologie, Syntax, Orthographie, Interpunktion.

Vorgabe: 230-250 Wörter, komplexe Satzstrukturen und adäquater Wortschatz werden erwartet.

Zu "Erfüllung der Aufgabe" bei Grafikinterpretation: Eine allgemeine Beschreibung der Grafik wird erwartet (nicht zwingend mit exakten Zahlen) — das ist die Grundvoraussetzung, wird aber nicht stark zusätzlich belohnt. Deutlich wichtiger für diesen Punkt ist die eigene Meinung, Einordnung und vorgeschlagene Maßnahmen/Lösungsideen zum Thema — genau wie bei einer Stellungnahme. Bewerte also eine reine, unkommentierte Zahlenbeschreibung ohne eigene Einschätzung als schwach in diesem Kriterium.

WICHTIGE REGEL zur Wortzahl: Liegt der Text deutlich unter 230 Wörtern, ist das laut Bewertungsschema automatisch ein Punkteabzug beim Kriterium Inhalt (Erfüllung der Aufgabe) — bei sehr kurzen Texten (z. B. unter 150 Wörtern) praktisch 0 von 5 Punkten in diesem Kriterium, unabhängig von der sonstigen Qualität. Prüfe die tatsächliche Wortzahl (unten angegeben) und wende diese Regel konsequent an.`

// Официальная шкала B1 VWU для Blog Comment (EPE Schreiben) — прислана
// пользователем напрямую (текст из реального оценочного листа
// экзамена), не мой черновик. 4 критерия по 5 баллов = 20 всего.
// Организована по критериям (а не по баллам, как в оригинальном
// документе) — так модели легче последовательно оценить каждый
// критерий по очереди, а не держать в голове всю таблицу сразу.
const EPE_BLOG_RUBRIC = `Official B1 VWU assessment scale for Blog Comment (4 criteria, 5 points each, 20 points total). Score each criterion 0-5 based on the descriptions below — do NOT factor word count into these scores, word count is scored separately and added afterwards.

TASK ACHIEVEMENT (T) — did the text fulfil the blog-comment task itself:
- 5: all 3 content points fully developed with relevant supporting details/examples; strong, convincing argumentation relevant to the blog post; text-type requirements (reference to the blog post, interactive elements, conversational tone) fully observed.
- 4: all 3 content points developed, though only 2 have full supporting detail; effective argumentation; text-type requirements generally observed.
- 3: all 3 content points addressed but not fully developed, only some relevant supporting detail; comprehensible argumentation; text-type requirements largely observed.
- 2: only 2 content points addressed and not fully developed, with insufficient/irrelevant supporting detail; argumentation not always convincing, use of empty phrases/platitudes; text-type requirements partly not observed.
- 1: only one or no content point developed; irrelevant content; incomprehensible or irrelevant argumentation; text-type requirements not observed.
- 0: fails to address the task at all, OR fewer than 110 words, OR illegible/unintelligible.

ORGANISATION AND COHERENCE (O):
- 5: very clear coherence and links between ideas and content points; text structured very clearly and logically; good, successful variety of linking devices/reference words/pronouns.
- 4: clear coherence/links between ideas and CPs; text generally clearly structured; some variety of linking devices, good use of reference words/pronouns.
- 3: sufficiently clear coherence/links; text sufficiently structured; limited but adequate variety of linking devices, reference words sufficiently clear.
- 2: difficulty producing clearly intelligible continuous writing, links between ideas/CPs unclear or missing; insufficiently structured, illogical or inadequate paragraphing; limited variety and/or inadequate use of linking devices, reference words sometimes unclear.
- 1: little if any coherence/links between ideas and CPs; ideas presented in random order without logical connections, no or illogical paragraphing; lack or inadequate use of linking devices, reference words frequently unclear.
- 0: no attempt at organisation.

LEXICAL AND STRUCTURAL RANGE (R):
- 5: very good variety of vocabulary and structures; no signs of limitations of expression; appropriate and convincing blogging style/register.
- 4: good variety of vocabulary and structures; almost no signs of limitations of expression; largely appropriate blogging style/register.
- 3: sufficient range of vocabulary and structures; some signs of limitations of expression (awkward expressions/repetitions), some prompt lifting; clearly distinguishable blogging style/register.
- 2: insufficient range of vocabulary and structures to fulfil the task; apparent limitations of expression (lots of repetition or awkward expressions), phrases lifted from the prompt; largely inappropriate blogging style/register.
- 1: hardly any structural or lexical range, resulting in a failure to express him/herself clearly; frequent failure to express appropriately, frequent repetition or lifting of phrases from the prompt; inappropriate blogging style/register.
- 0: performance fails to display any structural or lexical range.

LEXICAL AND STRUCTURAL ACCURACY (A):
- 5: very good control of frequent structures, basic vocabulary and punctuation; errors never impede understanding.
- 4: good control of frequent structures, basic vocabulary and punctuation; errors rarely impede communication.
- 3: sufficient control of frequent structures and basic vocabulary; errors impede communication only when trying to express complex ideas.
- 2: some severe lapses in the control of frequent structures, basic vocabulary and punctuation; errors occur even when trying to express basic ideas; frequent interference from other languages; reader has to make an effort to understand sections.
- 1: mistakes repeatedly cause misunderstanding/a breakdown of communication; elementary/basic mistakes; systematic interference from other languages; reader frequently has to stop to re-read sections.
- 0: errors cause a breakdown of communication throughout the text.

IMPORTANT rule: if Task Achievement (T) is scored 0, all other three criteria must also be scored 0 (this mirrors the official rule exactly).`

// Официальная таблица штрафов за длину текста Blog Comment (EPE,
// цель — 250 слов). Считаем программно, а не доверяем модели
// арифметику с порогами — только тут, а не в промпте, чтобы штраф был
// гарантированно точным. deduction вычитается из суммы T+O+R+A;
// forceZero — отдельное правило "меньше 110 слов = 0 баллов за всё".
function epeWordCountPenalty(words: number): { deduction: number; forceZero: boolean } {
  if (words < 110) return { deduction: 0, forceZero: true }
  if (words <= 129) return { deduction: 6, forceZero: false }
  if (words <= 149) return { deduction: 5, forceZero: false }
  if (words <= 169) return { deduction: 4, forceZero: false }
  if (words <= 189) return { deduction: 3, forceZero: false }
  if (words <= 209) return { deduction: 2, forceZero: false }
  if (words <= 224) return { deduction: 1, forceZero: false }
  if (words <= 275) return { deduction: 0, forceZero: false } // целевой диапазон (250 ± 10%), без штрафа
  if (words <= 375) return { deduction: 1, forceZero: false }
  if (words <= 475) return { deduction: 2, forceZero: false }
  return { deduction: 3, forceZero: false }
}

function buildPrompt({ examKey, choiceTitle, taskText, instructions, stimulusText, studentText, wordCountValue }: PromptInput): string {
  const instructionsList = instructions.length
    ? instructions.map((line, i) => `${i + 1}. ${line}`).join('\n')
    : '(пункты задания не указаны)'

  const stimulusBlock = stimulusText
    ? stimulusText
    : '(исходный материал — картинка, текст недоступен для этой проверки; оценивай только по заданию и инструкциям ниже)'

  const isGerman = examKey === 'epd'
  const language = isGerman ? 'немецком (уровень B1/B2, экзамен EPD)' : 'английском (уровень B1/B2, экзамен EPE)'

  // Единая официальная рубрика для всего EPD Schreiben (см.
  // EPD_SCHREIBEN_RUBRIC выше) — не зависит от того, Stellungnahme это
  // или Grafikinterpretation. Для EPE — официальная шкала B1 VWU для
  // Blog Comment (EPE_BLOG_RUBRIC), единственного типа письменного
  // задания в EPE.
  const criteriaNote = isGerman ? EPD_SCHREIBEN_RUBRIC : EPE_BLOG_RUBRIC

  const criteriaFormatHint = isGerman
    ? '"band" для каждого критерия — в формате "X из Y баллов" (например "3 из 5"), используя ровно те максимумы, что в рубрике выше (5/6/6/8). "overall.band" — сумма всех четырёх, в формате "X из 25".'
    : '"band" для каждого из четырёх критериев (Task Achievement, Organisation and Coherence, Lexical and Structural Range, Lexical and Structural Accuracy) — в формате "X из 5 баллов". "overall.band" временно оставь как "X из 20" (сумму этих четырёх без учёта штрафа за длину текста — итоговый штраф посчитает и применит сама платформа отдельно, не ты).'

  return `Ты — опытный экзаменатор письменной части языкового экзамена. Оцени сочинение студента на ${language}, как если бы ты был реальным экзаменатором EP-экзамена.

ЗАДАНИЕ (тип: ${choiceTitle}):
${taskText}

ПУНКТЫ, КОТОРЫЕ НУЖНО РАСКРЫТЬ:
${instructionsList}

ИСХОДНЫЙ МАТЕРИАЛ (то, на что отвечает студент):
${stimulusBlock}

${criteriaNote}

Количество слов в тексте студента (подсчитано программно, доверяй этому числу, а не своему подсчёту): ${wordCountValue}.

ТЕКСТ СТУДЕНТА:
${studentText}

Ответь СТРОГО в виде JSON (без markdown, без обрамления \`\`\`), в следующем формате:
{
  "overall": { "band": "${criteriaFormatHint}", "comment": "2-3 предложения общего впечатления на русском" },
  "criteria": [
    { "name": "название критерия на языке задания", "band": "оценка по этому критерию", "comment": "конкретный комментарий на русском — что хорошо, что поправить" }
  ],
  "strengths": ["короткий пункт на русском", "..."],
  "improvements": ["короткий пункт на русском о том, что улучшить", "..."]
}

Комментарии пиши на русском языке (это для русскоязычного студента), но названия критериев и примеры цитат из текста студента можно оставлять на языке задания. Будь конкретным — ссылайся на реальные фразы из текста студента, а не общими словами. Не выдумывай ничего про то, чего в тексте нет.`
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  if (!GEMINI_API_KEY) {
    return jsonResponse({ error: 'GEMINI_API_KEY не настроен на сервере.' }, 500)
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return jsonResponse({ error: 'Не авторизован.' }, 401)

    let body: { questionId?: string; testId?: string }
    try {
      body = await req.json()
    } catch {
      return jsonResponse({ error: 'Некорректный запрос.' }, 400)
    }
    const questionId = body.questionId
    const testId = body.testId
    if (!questionId) return jsonResponse({ error: 'questionId обязателен.' }, 400)
    if (!testId) return jsonResponse({ error: 'testId обязателен.' }, 400)

    // Клиент, работающий от имени пользователя — уважает RLS, поэтому
    // essay_submissions отдаст только его собственную запись.
    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    })

    const {
      data: { user },
      error: userErr,
    } = await userClient.auth.getUser()
    if (userErr || !user) return jsonResponse({ error: 'Не авторизован.' }, 401)

    const isPro = !!user.email && PRO_EMAILS.includes(user.email)

    // Дневной лимит — считаем, сколько проверок этот пользователь уже
    // получил с начала текущих суток (UTC), и отказываем до истечения
    // лимита. Простая реализация: essay_ai_reviews уже хранит и
    // user_id, и created_at — отдельная таблица-счётчик не нужна.
    // Pro-пользователи лимит не видят вообще.
    let todayCount = 0
    if (!isPro) {
      const startOfDayUtc = new Date()
      startOfDayUtc.setUTCHours(0, 0, 0, 0)
      const { count, error: countErr } = await userClient
        .from('essay_ai_reviews')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .gte('created_at', startOfDayUtc.toISOString())
      todayCount = count ?? 0
      if (countErr) {
        console.error('Daily limit count error:', countErr)
        // Не блокируем проверку из-за сбоя самого подсчёта лимита —
        // лучше пропустить проверку, чем ложно отказать всем.
      } else if (todayCount >= DAILY_LIMIT) {
        return jsonResponse(
          {
            error: `Дневной лимит проверок (${DAILY_LIMIT} в день) исчерпан. Новые проверки будут доступны завтра.`,
            usage: { used: todayCount, limit: DAILY_LIMIT },
          },
          429
        )
      }
    }

    const { data: question, error: qErr } = await userClient
      .from('questions')
      .select('id, type, text, instructions, essay_choice, stimulus_text')
      .eq('id', questionId)
      .single()
    if (qErr || !question) {
      console.error('Question lookup error:', qErr)
      // Настоящая причина (например, "column does not exist") кладём
      // прямо в ответ — вкладка Logs в Supabase у многих не показывает
      // console.error надёжно, а так видно сразу в Network в браузере.
      return jsonResponse({ error: 'Задание не найдено.', debug: qErr?.message || null }, 404)
    }
    if (question.type !== 'essay_choice') {
      return jsonResponse({ error: 'Это задание не является сочинением.' }, 400)
    }

    const { data: submission, error: sErr } = await userClient
      .from('essay_submissions')
      .select('text, choice_id, choice_title, exam_key')
      .eq('question_id', questionId)
      .eq('user_id', user.id)
      .eq('test_id', testId)
      .single()
    if (sErr || !submission || !submission.text?.trim()) {
      console.error('Submission lookup error:', sErr)
      return jsonResponse(
        { error: 'Сначала сохраните сочинение — начните писать в этом задании.', debug: sErr?.message || null },
        400
      )
    }

    const words = wordCount(submission.text)
    if (words < MIN_WORDS) {
      return jsonResponse({ error: `Текст слишком короткий для проверки (сейчас ${words} слов, нужно хотя бы ${MIN_WORDS}).` }, 400)
    }

    // Для многотемных EPD-заданий берём text/instructions/image именно
    // выбранной темы из essay_choice.options; для однотемных (EPE Blog
    // Comment и т.п.) верхнеуровневые question.text/instructions уже
    // несут реальное содержание — так исторически устроены эти задания.
    const options = (question.essay_choice?.options ?? []) as Array<{
      id: string
      title: string
      text?: string
      instructions?: string[]
    }>
    const chosenOption = options.find((o) => o.id === submission.choice_id)
    const taskText = chosenOption?.text?.trim() || question.text || ''
    const instructions =
      chosenOption?.instructions && chosenOption.instructions.length > 0 ? chosenOption.instructions : question.instructions || []

    const prompt = buildPrompt({
      examKey: submission.exam_key,
      choiceTitle: submission.choice_title || chosenOption?.title || 'Sochinenie',
      taskText,
      instructions,
      stimulusText: question.stimulus_text,
      studentText: submission.text,
      wordCountValue: words,
    })

    // Gemini иногда отвечает 503 "model is currently experiencing high
    // demand" — это временная перегрузка на стороне Google (сентябрь
    // 2026: бесплатный тариф Gemini сильно урезан, такие перегрузки
    // сейчас частое явление у всех, не только у нас). Пробуем ещё пару
    // раз с паузой, а если основная модель всё равно недоступна —
    // пробуем резервную: у разных моделей независимая ёмкость на
    // серверах Google, одна может быть перегружена, пока другая свободна.
    async function callGeminiModel(model: string) {
      const maxAttempts = 2
      let lastErrText = ''
      let lastStatus = 0
      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
              generationConfig: { temperature: 0.3, responseMimeType: 'application/json' },
            }),
          }
        )
        if (res.ok) return { ok: true as const, res }
        lastStatus = res.status
        lastErrText = await res.text()
        // 503 (перегружена) и 429 (лимит запросов) — временные, имеет
        // смысл повторить. Остальные статусы (неверный ключ, неверная
        // модель и т.п.) повторять бессмысленно — они не изменятся.
        if (res.status !== 503 && res.status !== 429) break
        if (attempt < maxAttempts) {
          console.error(`Gemini ${model} ${res.status}, retry ${attempt}/${maxAttempts - 1}:`, lastErrText)
          await new Promise((r) => setTimeout(r, attempt * 1200))
        }
      }
      return { ok: false as const, status: lastStatus, errText: lastErrText }
    }

    let geminiResult = await callGeminiModel(GEMINI_MODEL)
    let modelUsed = GEMINI_MODEL
    if (!geminiResult.ok && (geminiResult.status === 503 || geminiResult.status === 429)) {
      console.error(`${GEMINI_MODEL} unavailable, falling back to ${GEMINI_FALLBACK_MODEL}`)
      geminiResult = await callGeminiModel(GEMINI_FALLBACK_MODEL)
      modelUsed = GEMINI_FALLBACK_MODEL
    }

    if (!geminiResult.ok) {
      console.error('Gemini error after retries + fallback:', geminiResult.status, geminiResult.errText)
      const isOverloaded = geminiResult.status === 503 || geminiResult.status === 429
      return jsonResponse(
        {
          error: isOverloaded
            ? 'Сервис ИИ сейчас перегружен — такое бывает при высокой нагрузке у Google. Подождите минуту и попробуйте ещё раз.'
            : 'Не удалось получить ответ от ИИ. Попробуйте позже.',
          debug: geminiResult.errText.slice(0, 500),
        },
        502
      )
    }

    const geminiRes = geminiResult.res

    const geminiData = await geminiRes.json()
    const rawText = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text
    if (!rawText) {
      console.error('Empty Gemini response:', JSON.stringify(geminiData))
      return jsonResponse({ error: 'Пустой ответ от ИИ.' }, 502)
    }

    let feedback: any
    try {
      feedback = JSON.parse(rawText)
    } catch {
      console.error('Failed to parse Gemini JSON:', rawText)
      return jsonResponse({ error: 'Не удалось разобрать ответ ИИ.' }, 502)
    }

    // Штраф за длину текста для EPE (Blog Comment) — считаем сами, не
    // доверяя это модели (см. epeWordCountPenalty выше). Модель
    // намеренно не учитывала длину текста при выставлении баллов по
    // критериям — правим итог здесь, один раз, гарантированно точно
    // по официальной таблице.
    if (submission.exam_key === 'epe' && feedback && typeof feedback === 'object') {
      const penalty = epeWordCountPenalty(words)
      const rawTotal = Array.isArray(feedback.criteria)
        ? feedback.criteria.reduce((sum: number, c: any) => {
            const match = typeof c.band === 'string' ? c.band.match(/(\d+)/) : null
            return sum + (match ? Number(match[1]) : 0)
          }, 0)
        : 0
      const finalTotal = penalty.forceZero ? 0 : Math.max(0, rawTotal - penalty.deduction)
      feedback.overall = feedback.overall || {}
      feedback.overall.band = `${finalTotal} из 20`
      if (penalty.forceZero) {
        feedback.overall.comment = `Текст короче 110 слов (сейчас ${words}) — по официальной шкале это автоматически 0 баллов за всё сочинение. ${feedback.overall.comment || ''}`.trim()
      } else if (penalty.deduction > 0) {
        feedback.overall.comment = `${feedback.overall.comment || ''} Штраф за длину текста (${words} слов вместо целевых ~250): −${penalty.deduction} балл(ов) от суммы ${rawTotal}.`.trim()
      }
    }

    // Пишем сервисным ключом — у обычных пользователей нет INSERT-права
    // на essay_ai_reviews (см. schema.sql), это осознанно.
    const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    const { data: saved, error: insErr } = await adminClient
      .from('essay_ai_reviews')
      .insert({
        user_id: user.id,
        question_id: questionId,
        test_id: testId,
        submitted_text: submission.text,
        feedback,
        model: modelUsed,
      })
      .select()
      .single()

    const usage = isPro ? null : { used: todayCount + 1, limit: DAILY_LIMIT }

    if (insErr) {
      console.error('Insert error:', insErr)
      // ИИ уже ответил — отдаём результат клиенту, даже если сохранить не удалось.
      return jsonResponse({ feedback, model: modelUsed, saved: false, usage })
    }

    return jsonResponse({ ...saved, usage })
  } catch (err) {
    console.error('check-essay unhandled error:', err)
    return jsonResponse({ error: 'Внутренняя ошибка сервера.' }, 500)
  }
})
