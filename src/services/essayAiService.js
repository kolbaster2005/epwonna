// ---------------------------------------------------------------------
// AI-проверка сочинений (essay_choice) через Gemini. Сама проверка
// происходит в Edge Function `check-essay` (см.
// supabase/functions/check-essay/index.ts) — этот файл только вызывает
// её и читает уже сохранённые результаты. Ключ Gemini живёт только на
// сервере, сюда не попадает.
// ---------------------------------------------------------------------

import { supabase } from '../lib/supabaseClient.js'

// Держим в синхроне со значением DAILY_LIMIT в
// supabase/functions/check-essay/index.ts — сервер всё равно является
// источником правды (это только для отображения "X из N" до того, как
// придёт первый реальный ответ функции).
export const DAILY_ESSAY_CHECK_LIMIT = 2

function toError(err) {
  return err instanceof Error ? err : new Error(err?.message || 'Неизвестная ошибка')
}

function rowToReview(row) {
  return {
    id: row.id,
    questionId: row.question_id,
    testId: row.test_id,
    submittedText: row.submitted_text,
    feedback: row.feedback,
    model: row.model,
    createdAt: row.created_at,
  }
}

// Сколько проверок пользователь уже использовал сегодня (UTC) — для
// отображения "X из N" рядом с кнопкой ещё до первого клика. Реальный
// лимит применяется на сервере (см. check-essay/index.ts); это только
// витрина, доверять как источнику правды нельзя (могут быть гонки
// между вкладками и т.п.), но для UI-подсказки достаточно.
export async function getTodayEssayCheckUsage(userId) {
  if (!userId) return { used: 0, limit: DAILY_ESSAY_CHECK_LIMIT }
  try {
    const startOfDayUtc = new Date()
    startOfDayUtc.setUTCHours(0, 0, 0, 0)
    const { count, error } = await supabase
      .from('essay_ai_reviews')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .gte('created_at', startOfDayUtc.toISOString())
    if (error) throw error
    return { used: count ?? 0, limit: DAILY_ESSAY_CHECK_LIMIT }
  } catch (err) {
    console.error('[essayAiService.getTodayEssayCheckUsage]', toError(err))
    return { used: 0, limit: DAILY_ESSAY_CHECK_LIMIT }
  }
}

// Запускает проверку сочинения по (questionId, testId) — Edge Function
// сама найдёт сохранённое сочинение текущего пользователя по этой
// паре, так что здесь не нужно (и нельзя) передавать текст напрямую.
// testId обязателен: одно и то же задание может встречаться в
// нескольких пробниках через переиспользование банка — без testId
// проверка одного пробника перетекала бы в другой. Бросает Error с
// человекочитаемым сообщением при неудаче (нет сохранённого сочинения,
// текст слишком короткий, сбой самого ИИ, исчерпан дневной лимит и
// т.д.) — у брошенной ошибки есть поле `.usage` ({used, limit}), если
// сервер его прислал, чтобы обновить счётчик в интерфейсе даже после
// неудачной попытки (например, когда лимит исчерпан).
export async function checkEssayWithAI(questionId, testId) {
  const { data, error } = await supabase.functions.invoke('check-essay', {
    body: { questionId, testId },
  })
  if (error) {
    // supabase-js кладёт тело ответа функции в error.context для
    // FunctionsHttpError — пытаемся вытащить наше собственное
    // сообщение об ошибке оттуда, иначе показываем общее.
    let message = 'Не удалось выполнить проверку. Попробуйте позже.'
    let usage = null
    try {
      const body = await error.context?.json?.()
      if (body?.error) message = body.error
      // debug — реальная причина от Postgres (см. check-essay/index.ts),
      // добавляем к сообщению, чтобы не лезть в логи Supabase за ней.
      if (body?.debug) message += ` (${body.debug})`
      if (body?.usage) usage = body.usage
    } catch {
      // тело не JSON или недоступно — оставляем общее сообщение
    }
    const err2 = new Error(message)
    err2.usage = usage
    throw err2
  }
  if (data?.error) {
    const err2 = new Error(data.error)
    err2.usage = data.usage || null
    throw err2
  }
  const review = rowToReview(data)
  review.usage = data.usage || null
  return review
}

// Последняя проверка для пары (вопрос, пробник) — для повторного
// открытия «Мои сочинения» или возврата в тест без повторного вызова
// ИИ. testId обязателен по той же причине, что и в checkEssayWithAI —
// без него проверка из одного пробника показывалась бы и в другом.
// RLS уже гарантирует, что увидим только свои проверки.
export async function getLatestEssayReview(questionId, testId) {
  if (!testId) return null
  try {
    const { data, error } = await supabase
      .from('essay_ai_reviews')
      .select('*')
      .eq('question_id', questionId)
      .eq('test_id', testId)
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

// Все проверки для набора (вопрос, пробник) — используется в «Мои
// сочинения», чтобы не делать по одному запросу на каждое сочинение.
// Принимает список сочинений (каждое с questionId и testId, как их
// возвращает listEssaySubmissions), а не просто questionId — та же
// задача, решённая в двух разных пробниках, теперь два отдельных
// сочинения с двумя отдельными проверками, не одна на двоих. Возвращает
// Map<`${questionId}:${testId}`, review> с самой свежей проверкой на
// пару.
export async function getLatestEssayReviewsByEssays(essays) {
  if (!essays?.length) return new Map()
  const questionIds = [...new Set(essays.map((e) => e.questionId))]
  try {
    const { data, error } = await supabase
      .from('essay_ai_reviews')
      .select('*')
      .in('question_id', questionIds)
      .order('created_at', { ascending: false })
    if (error) throw error
    const map = new Map()
    for (const row of data || []) {
      // Первая встреченная запись на пару (question_id, test_id) —
      // самая свежая, благодаря сортировке выше; последующие для той
      // же пары пропускаем.
      const key = `${row.question_id}:${row.test_id}`
      if (!map.has(key)) map.set(key, rowToReview(row))
    }
    return map
  } catch (err) {
    console.error('[essayAiService.getLatestEssayReviewsByEssays]', toError(err))
    return new Map()
  }
}
