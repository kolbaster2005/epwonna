// ---------------------------------------------------------------------
// Pro-фича: сборка тренировки по теме и/или типу задания из банка
// заданий. Сама сборка происходит в Edge Function
// (supabase/functions/generate-practice-test/index.ts) — она же
// заново проверяет, что пользователь действительно pro, а не
// доверяет тому, что сказал клиент.
// ---------------------------------------------------------------------

import { supabase } from '../lib/supabaseClient.js'

function toError(err) {
  return err instanceof Error ? err : new Error(err?.message || 'Не удалось выполнить запрос.')
}

// Все разные task_type, которые реально встречаются в банке заданий
// этого экзамена — для выпадающего списка на странице тренировки.
// null/'' у части заданий (обычные вопросы без явного типа) не
// включаем — там нечего выбирать целенаправленно, это не какой-то
// один конкретный формат.
export async function listTaskTypesForExam(examKey) {
  try {
    const { data, error } = await supabase
      .from('questions')
      .select('task_type')
      .eq('test_id', `${examKey}-task-bank`)
      .not('task_type', 'is', null)
    if (error) throw error
    const unique = [...new Set((data || []).map((r) => r.task_type).filter(Boolean))]
    unique.sort((a, b) => a.localeCompare(b))
    return unique
  } catch (err) {
    console.error('[practiceService.listTaskTypesForExam]', toError(err))
    return []
  }
}

// Создаёт тренировку и возвращает { testId, title, questionCount } —
// дальше фронтенд просто переходит на /{examKey}/test/{testId}, это
// обычный тест, ничем не отличающийся от настоящего пробника с точки
// зрения TestPage.jsx.
export async function generatePracticeTest({ examKey, topicId, taskType }) {
  const { data, error } = await supabase.functions.invoke('generate-practice-test', {
    body: { examKey, topicId: topicId || undefined, taskType: taskType || undefined },
  })
  if (error) {
    let message = 'Не удалось собрать тренировку. Попробуйте позже.'
    try {
      const body = await error.context?.json?.()
      if (body?.error) message = body.error
      if (body?.debug) message += ` (${body.debug})`
    } catch {
      // тело не JSON или недоступно
    }
    throw new Error(message)
  }
  if (data?.error) throw new Error(data.error)
  return data
}
