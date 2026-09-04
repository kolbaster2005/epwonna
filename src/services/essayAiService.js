// ---------------------------------------------------------------------
// AI-проверка сочинений (essay_choice) через Gemini. Сама проверка
// происходит в Edge Function `check-essay` (см.
// supabase/functions/check-essay/index.ts) — этот файл только вызывает
// её и читает уже сохранённые результаты. Ключ Gemini живёт только на
// сервере, сюда не попадает.
// ---------------------------------------------------------------------

import { supabase } from '../lib/supabaseClient.js'

function toError(err) {
  return err instanceof Error ? err : new Error(err?.message || 'Неизвестная ошибка')
}

function rowToReview(row) {
  return {
    id: row.id,
    questionId: row.question_id,
    submittedText: row.submitted_text,
    feedback: row.feedback,
    model: row.model,
    createdAt: row.created_at,
  }
}

// Запускает проверку сочинения по questionId — Edge Function сама
// найдёт сохранённое сочинение текущего пользователя по этому
// вопросу, так что здесь не нужно (и нельзя) передавать текст напрямую.
// Бросает Error с человекочитаемым сообщением при неудаче (нет
// сохранённого сочинения, текст слишком короткий, сбой самого ИИ и т.д.).
export async function checkEssayWithAI(questionId) {
  const { data, error } = await supabase.functions.invoke('check-essay', {
    body: { questionId },
  })
  if (error) {
    // supabase-js кладёт тело ответа функции в error.context для
    // FunctionsHttpError — пытаемся вытащить наше собственное
    // сообщение об ошибке оттуда, иначе показываем общее.
    let message = 'Не удалось выполнить проверку. Попробуйте позже.'
    try {
      const body = await error.context?.json?.()
      if (body?.error) message = body.error
      // debug — реальная причина от Postgres (см. check-essay/index.ts),
      // добавляем к сообщению, чтобы не лезть в логи Supabase за ней.
      if (body?.debug) message += ` (${body.debug})`
    } catch {
      // тело не JSON или недоступно — оставляем общее сообщение
    }
    throw new Error(message)
  }
  if (data?.error) throw new Error(data.error)
  return rowToReview(data)
}

// Последняя проверка для вопроса (для повторного открытия «Мои
// сочинения» без повторного вызова ИИ). RLS уже гарантирует, что
// увидим только свои проверки.
export async function getLatestEssayReview(questionId) {
  try {
    const { data, error } = await supabase
      .from('essay_ai_reviews')
      .select('*')
      .eq('question_id', questionId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (error) throw error
    return data ? rowToReview(data) : null
  } catch (err) {
    console.error('[essayAiService.getLatestEssayReview]', toError(err))
    return null
  }
}

// Все проверки для набора вопросов разом — используется в «Мои
// сочинения», чтобы не делать по одному запросу на каждое сочинение.
// Возвращает Map<questionId, review> с самой свежей проверкой на вопрос.
export async function getLatestEssayReviewsByQuestionIds(questionIds) {
  if (!questionIds?.length) return new Map()
  try {
    const { data, error } = await supabase
      .from('essay_ai_reviews')
      .select('*')
      .in('question_id', questionIds)
      .order('created_at', { ascending: false })
    if (error) throw error
    const map = new Map()
    for (const row of data || []) {
      // Первая встреченная запись на question_id — самая свежая,
      // благодаря сортировке выше; последующие для того же id пропускаем.
      if (!map.has(row.question_id)) map.set(row.question_id, rowToReview(row))
    }
    return map
  } catch (err) {
    console.error('[essayAiService.getLatestEssayReviewsByQuestionIds]', toError(err))
    return new Map()
  }
}
