// supabase/functions/check-qa-table/index.ts
//
// Проверяет грамматические задания типа qa_table (task_type
// "Umformung" или "Satzfortsetzungen", EPD) через Gemini и сохраняет
// результат в qa_table_ai_reviews. Вызывается с фронтенда как:
//   POST /functions/v1/check-qa-table
//   { questionId: string, testId: string, answers: { [rowId]: string } }
//   Authorization: Bearer <user JWT>
//
// В отличие от check-essay, ответы на qa_table нигде не хранятся по
// мере ввода (только в answersSnapshot при отправке всего пробника) —
// поэтому answers приходят прямо в теле запроса, а не читаются из
// отдельной таблицы черновиков. Сама функция всё равно читает вопрос
// (qa_table.rows) из БД, чтобы не доверять клиенту в том, что
// собственно нужно было сделать в каждой строке.
//
// testId обязателен по той же причине, что и в check-essay: одно и то
// же задание может быть привязано к нескольким пробникам через
// test_tasks (банк переиспользуется).
//
// Секреты — те же, что уже настроены для check-essay:
//   supabase secrets set GEMINI_API_KEY=...

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY')
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const GEMINI_MODEL = 'gemini-3.5-flash'
const GEMINI_FALLBACK_MODEL = 'gemini-3.5-flash-lite'
// Общий лимит на день — не по каждому заданию отдельно (было так
// раньше, но оказалось хуже для юзабилити: если человек проверил уже
// N заданий и хочет проверить ещё одно, ему не нужно помнить лимит на
// КАЖДОЕ по отдельности — один дневной счётчик на все грамматические
// проверки сразу проще для восприятия). Держим в синхроне с
// DAILY_QA_TABLE_CHECK_LIMIT в src/services/qaTableAiService.js.
const DAILY_LIMIT = 4
// Держим в синхроне со списком в src/contexts/AuthContext.jsx и
// supabase/functions/generate-practice-test/index.ts.
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

// Те же две задачи, для которых сейчас есть промпт — остальные
// task_type у qa_table (Editing, Synonyme, Referenzwörter, Heading
// Match и т.д.) не поддерживаются: у них не про грамматику развёрнутого
// ответа, а про короткие однословные/выборные ответы, для которых
// программной проверки достаточно.
const SUPPORTED_TASK_TYPES = new Set(['Umformung', 'Satzfortsetzungen'])

// Как и на фронтенде (QuestionAnswerInput.jsx) — у части строк
// Umformung в prompt через перевод строки склеены исходное предложение
// и начало преобразованного. Та же логика разбора здесь, чтобы
// показать модели ровно то же разделение, что видит сам студент.
function splitPrompt(prompt: string): { main: string; continuation: string } {
  const idx = prompt.indexOf('\n')
  if (idx === -1) return { main: prompt, continuation: '' }
  return { main: prompt.slice(0, idx), continuation: prompt.slice(idx + 1) }
}

type Row = {
  id: string
  prompt: string
  after?: string
  freeText?: boolean
  given?: string
  sampleAnswer?: string
}

function buildPrompt(taskType: string, taskText: string, rows: Row[], answers: Record<string, string>): string {
  const rowBlocks = rows
    .map((row, i) => {
      const answer = (answers[row.id] || '').trim() || '(пусто — студент не ответил)'
      if (taskType === 'Umformung') {
        const { main, continuation } = splitPrompt(row.prompt)
        const gapContext = continuation || row.after ? `${continuation}[ANTWORT DES STUDENTEN]${row.after || ''}` : '[ANTWORT DES STUDENTEN]'
        return `Zeile ${i + 1} (id: ${row.id}):
Originalsatz: ${main}
Zu vervollständigender Satz (die Lücke ist markiert): ${gapContext}
Antwort des Studenten (das, was er/sie anstelle von [ANTWORT DES STUDENTEN] geschrieben hat): ${answer}`
      }
      // Satzfortsetzungen
      return `Zeile ${i + 1} (id: ${row.id}):
Satzanfang: ${row.prompt}
Fortsetzung des Studenten: ${answer}`
    })
    .join('\n\n')

  const criteria =
    taskType === 'Umformung'
      ? `Bewertungskriterien (max. 2 Punkte pro Zeile):
- 2 Punkte: Der Satz wurde inhaltlich richtig umgeformt (gleiche Bedeutung wie im Originalsatz, richtige grammatikalische Struktur — z. B. Nominalphrase korrekt zu Nebensatz/Verbalstruktur umgeformt) UND ist grammatikalisch fehlerfrei.
- 1 Punkt: Die Umformung ist inhaltlich im Wesentlichen richtig, hat aber Grammatikfehler, oder die Struktur ist nicht ganz korrekt umgeformt (z. B. Präposition/Konjunktion falsch, aber Sinn erkennbar).
- 0 Punkte: Falsche Umformung (Bedeutung verändert, falsche Struktur) oder gravierende Grammatikfehler, oder keine Antwort.`
      : `Bewertungskriterien (max. 3 Punkte pro Zeile):
- 3 Punkte: Grammatikalisch und inhaltlich korrekte, komplexe Fortsetzung — mit unterschiedlichen Verben, komplexen Strukturen (z. B. Nebensätze) und einem differenzierten, inhaltsadäquaten Wortschatz. Beispiel: "Einerseits wird der illegale Drogenhandel bekämpft, andererseits steigt in vielen Ländern die Zahl der Drogenabhängigen, was soziale Einrichtungen vor große Herausforderungen stellt."
- 2 Punkte: Grammatikalisch und inhaltlich korrekte, aber einfache Fortsetzung (ein einfacher Hauptsatz, keine komplexeren Strukturen). Beispiel: "Einerseits wird der illegale Drogenhandel bekämpft, andererseits steigt in vielen Ländern die Zahl der Drogenabhängigen."
- 1 Punkt: Die Fortsetzung ist inhaltlich passend, hat aber spürbare Grammatikfehler.
- 0 Punkte: Inhaltlich unpassend/unlogisch, gravierende Grammatikfehler, oder keine Antwort.`

  return `Du bist ein erfahrener Prüfer für den schriftlichen Teil der deutschen Sprachprüfung EPD (Niveau B1/B2). Bewerte die folgenden Antworten eines Studenten zur Aufgabe „${taskText}" (Typ: ${taskType}).

${criteria}

Variiere die Bewertung ehrlich zeilenweise — nicht jede Zeile automatisch mit der Höchstpunktzahl bewerten, nur weil sie grammatikalisch fehlerfrei ist (bei Satzfortsetzungen ist die Komplexität entscheidend für 2 vs. 3 Punkte).

AUFGABEN:

${rowBlocks}

Antworte AUSSCHLIESSLICH als JSON (kein Markdown, keine \`\`\`-Umrandung), in folgendem Format:
{
  "rows": [
    { "id": "id der Zeile", "score": Zahl, "maxScore": ${taskType === 'Umformung' ? 2 : 3}, "comment": "1-2 Sätze auf Russisch — was ist gut, was fehlt oder ist falsch" }
  ],
  "overallComment": "2-3 Sätze auf Russisch — allgemeiner Eindruck über alle Zeilen hinweg"
}

Der Kommentar muss auf Russisch sein (für einen russischsprachigen Studenten), kann aber Zitate aus der Antwort des Studenten auf Deutsch enthalten. Sei konkret — beziehe dich auf die tatsächliche Antwort, nicht auf allgemeine Floskeln.`
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  if (!GEMINI_API_KEY) {
    return jsonResponse({ error: 'GEMINI_API_KEY не настроен на сервере.' }, 500)
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return jsonResponse({ error: 'Не авторизован.' }, 401)

    let body: { questionId?: string; testId?: string; answers?: Record<string, string> }
    try {
      body = await req.json()
    } catch {
      return jsonResponse({ error: 'Некорректный запрос.' }, 400)
    }
    const questionId = body.questionId
    const testId = body.testId
    const answers = body.answers || {}
    if (!questionId) return jsonResponse({ error: 'questionId обязателен.' }, 400)
    if (!testId) return jsonResponse({ error: 'testId обязателен.' }, 400)

    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    })

    const {
      data: { user },
      error: userErr,
    } = await userClient.auth.getUser()
    if (userErr || !user) return jsonResponse({ error: 'Не авторизован.' }, 401)

    const isPro = !!user.email && PRO_EMAILS.includes(user.email)

    let usedCount = 0
    if (!isPro) {
      const startOfDayUtc = new Date()
      startOfDayUtc.setUTCHours(0, 0, 0, 0)
      const { count, error: countErr } = await userClient
        .from('qa_table_ai_reviews')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .gte('created_at', startOfDayUtc.toISOString())
      usedCount = count ?? 0
      if (countErr) {
        console.error('Daily limit count error:', countErr)
      } else if (usedCount >= DAILY_LIMIT) {
        return jsonResponse(
          {
            error: `Дневной лимит проверок (${DAILY_LIMIT} в день) исчерпан. Новые проверки будут доступны завтра.`,
            usage: { used: usedCount, limit: DAILY_LIMIT },
          },
          429
        )
      }
    }

    const { data: question, error: qErr } = await userClient
      .from('questions')
      .select('id, type, text, task_type, qa_table')
      .eq('id', questionId)
      .single()
    if (qErr || !question) {
      console.error('Question lookup error:', qErr)
      return jsonResponse({ error: 'Задание не найдено.', debug: qErr?.message || null }, 404)
    }
    if (question.type !== 'qa_table') {
      return jsonResponse({ error: 'Это задание не поддерживает AI-проверку такого рода.' }, 400)
    }
    if (!question.task_type || !SUPPORTED_TASK_TYPES.has(question.task_type)) {
      return jsonResponse({ error: 'AI-проверка пока доступна только для заданий Umformung и Satzfortsetzungen.' }, 400)
    }

    const allRows = (question.qa_table?.rows ?? []) as Row[]
    // given-строки (например, Beispiel) не требуют ответа студента —
    // не отправляем их на проверку.
    const rows = allRows.filter((r) => r.given === undefined)
    if (rows.length === 0) {
      return jsonResponse({ error: 'В этом задании нет строк для проверки.' }, 400)
    }

    const answeredCount = rows.filter((r) => (answers[r.id] || '').trim().length > 0).length
    if (answeredCount === 0) {
      return jsonResponse({ error: 'Сначала заполните хотя бы одну строку задания.' }, 400)
    }

    const prompt = buildPrompt(question.task_type, question.text || '', rows, answers)

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

    const geminiData = await geminiResult.res.json()
    const rawText = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text
    if (!rawText) {
      console.error('Empty Gemini response:', JSON.stringify(geminiData))
      return jsonResponse({ error: 'Пустой ответ от ИИ.' }, 502)
    }

    let feedback: {
      rows?: Array<{ id: string; score: number; maxScore: number; comment: string }>
      overallComment?: string
      totalScore?: number
      totalMax?: number
    }
    try {
      feedback = JSON.parse(rawText)
    } catch {
      console.error('Failed to parse Gemini JSON:', rawText)
      return jsonResponse({ error: 'Не удалось разобрать ответ ИИ.' }, 502)
    }

    // Считаем сумму сами, не доверяя модели — надёжнее, чем просить
    // её саму сложить числа.
    const maxPerRow = question.task_type === 'Umformung' ? 2 : 3
    const rowsWithScores = feedback.rows || []
    const totalScore = rowsWithScores.reduce((sum, r) => sum + (Number.isFinite(r.score) ? r.score : 0), 0)
    const totalMax = rows.length * maxPerRow
    feedback = { ...feedback, totalScore, totalMax }

    const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    const { data: saved, error: insErr } = await adminClient
      .from('qa_table_ai_reviews')
      .insert({
        user_id: user.id,
        question_id: questionId,
        test_id: testId,
        submitted_answers: answers,
        feedback,
        model: modelUsed,
      })
      .select()
      .single()

    const usage = isPro ? null : { used: usedCount + 1, limit: DAILY_LIMIT }

    if (insErr) {
      console.error('Insert error:', insErr)
      return jsonResponse({ feedback, model: modelUsed, saved: false, usage })
    }

    return jsonResponse({ ...saved, usage })
  } catch (err) {
    console.error('check-qa-table unhandled error:', err)
    return jsonResponse({ error: 'Внутренняя ошибка сервера.' }, 500)
  }
})
