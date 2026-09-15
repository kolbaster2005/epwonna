// ---------------------------------------------------------------------
// AI-проверка грамматических заданий qa_table (Umformung /
// Satzfortsetzungen, EPD) через Gemini. Сама проверка происходит в
// Edge Function `check-qa-table` (см.
// supabase/functions/check-qa-table/index.ts) — этот файл только
// вызывает её и читает уже сохранённые результаты. Ключ Gemini живёт
// только на сервере.
//
// В отличие от essayAiService.js, ответы студента нигде не сохранены
// заранее (qa_table не пишется в БД до отправки всего пробника) —
// поэтому checkQaTableWithAI принимает сами ответы (`answers`) и
// отправляет их прямо в теле запроса.
// ---------------------------------------------------------------------

import { supabase } from '../lib/supabaseClient.js'

// Держим в синхроне со значением PER_QUESTION_LIMIT в
// supabase/functions/check-qa-table/index.ts — сервер всё равно
// источник правды, это только для отображения "X из N" до первого
// реального ответа функции. Лимит свой у каждого задания (считается
// отдельно по вопросу), а не общий «в день» на все задания сразу.
export const PER_QUESTION_QA_TABLE_CHECK_LIMIT = 2

function toError(err) {
  return err instanceof Error ? err : new Error(err?.message || 'Неизвестная ошибка')
}

function rowToReview(row) {
  return {
    id: row.id,
    questionId: row.question_id,
    testId: row.test_id,
    submittedAnswers: row.submitted_answers,
    feedback: row.feedback,
    model: row.model,
    createdAt: row.created_at,
  }
}

// Сколько раз уже проверяли именно ЭТО задание (в рамках именно этого
// пробника) — не сумма по всем грамматическим заданиям сразу.
export async function getQuestionQaTableCheckUsage(userId, questionId, testId) {
  if (!userId || !questionId || !testId) return { used: 0, limit: PER_QUESTION_QA_TABLE_CHECK_LIMIT }
  try {
    const { count, error } = await supabase
      .from('qa_table_ai_reviews')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('question_id', questionId)
      .eq('test_id', testId)
    if (error) throw error
    return { used: count ?? 0, limit: PER_QUESTION_QA_TABLE_CHECK_LIMIT }
  } catch (err) {
    console.error('[qaTableAiService.getQuestionQaTableCheckUsage]', toError(err))
    return { used: 0, limit: PER_QUESTION_QA_TABLE_CHECK_LIMIT }
  }
}

// Запускает проверку по (questionId, testId, answers) — answers это
// { [rowId]: string }, снятое из текущего (возможно ещё не
// сохранённого) состояния задания на странице теста. testId
// обязателен по той же причине, что и в essayAiService — задание
// может встречаться в нескольких пробниках через переиспользование
// банка. Бросает Error с человекочитаемым сообщением при неудаче — у
// ошибки есть поле `.usage`, если сервер его прислал.
export async function checkQaTableWithAI(questionId, testId, answers) {
  const { data, error } = await supabase.functions.invoke('check-qa-table', {
    body: { questionId, testId, answers },
  })
  if (error) {
    let message = 'Не удалось выполнить проверку. Попробуйте позже.'
    let usage = null
    try {
      const body = await error.context?.json?.()
      if (body?.error) message = body.error
      if (body?.debug) message += ` (${body.debug})`
      if (body?.usage) usage = body.usage
    } catch {
      // тело не JSON или недоступно
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

// Последняя проверка для пары (вопрос, пробник) — чтобы при
// возвращении на уже проверенное задание не пропадал результат.
export async function getLatestQaTableReview(questionId, testId) {
  if (!testId) return null
  try {
    const { data, error } = await supabase
      .from('qa_table_ai_reviews')
      .select('*')
      .eq('question_id', questionId)
      .eq('test_id', testId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (error) throw error
    return data ? rowToReview(data) : null
  } catch (err) {
    console.error('[qaTableAiService.getLatestQaTableReview]', toError(err))
    return null
  }
}
