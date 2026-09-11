// ---------------------------------------------------------------------
// Real progress tracking for МОЁ ОБУЧЕНИЕ → «Мой прогресс». See
// supabase/schema.sql for the `test_attempts` table + RLS. Written
// tests only — see TestPage.jsx's handleFinish for where rows get
// written; oral tests aren't scored yet, so nothing to save there.
// ---------------------------------------------------------------------

import { supabase } from '../lib/supabaseClient.js'

function rowToAttempt(row) {
  return {
    id: row.id,
    testId: row.test_id,
    examKey: row.exam_key,
    testTitle: row.test_title,
    scorePercent: row.score_percent,
    correctCount: row.correct_count,
    partialCount: row.partial_count,
    incorrectCount: row.incorrect_count,
    ungradedCount: row.ungraded_count,
    totalQuestions: row.total_questions,
    durationSeconds: row.duration_seconds,
    completedAt: row.completed_at,
    answersSnapshot: row.answers_snapshot ?? null,
  }
}

// Called once from TestPage.jsx when a written test finishes. Fire-and-
// forget from the caller's side — a failed save shouldn't block the
// person from seeing their results screen. `answersSnapshot` is
// { answers, selfGrades } — everything AttemptReview.jsx needs to
// re-render exactly what was answered later. Returns the new row's id
// (so the results screen can link straight to its review page), or
// null if the save failed.
export async function saveAttempt({
  userId,
  testId,
  examKey,
  testTitle,
  scorePercent,
  correctCount,
  partialCount,
  incorrectCount,
  ungradedCount,
  totalQuestions,
  durationSeconds,
  answersSnapshot,
}) {
  try {
    const { data, error } = await supabase
      .from('test_attempts')
      .insert({
        user_id: userId,
        test_id: testId,
        exam_key: examKey,
        test_title: testTitle,
        score_percent: scorePercent,
        correct_count: correctCount,
        partial_count: partialCount,
        incorrect_count: incorrectCount,
        ungraded_count: ungradedCount,
        total_questions: totalQuestions,
        duration_seconds: durationSeconds,
        answers_snapshot: answersSnapshot ?? null,
      })
      .select('id')
      .single()
    if (error) throw error
    return data.id
  } catch (err) {
    console.error('[attemptsService.saveAttempt]', err)
    return null
  }
}

// All of the current user's attempts, newest first — used for both the
// "Последние пробники" list (sliced to a handful) and the trend chart
// (reversed to chronological order there).
export async function listAttempts(userId) {
  try {
    const { data, error } = await supabase
      .from('test_attempts')
      .select('*')
      .eq('user_id', userId)
      .order('completed_at', { ascending: false })
    if (error) throw error
    return (data || []).map(rowToAttempt)
  } catch (err) {
    console.error('[attemptsService.listAttempts]', err)
    return []
  }
}

// Удаляет попытку безвозвратно — RLS уже гарантирует, что можно
// удалить только свою собственную (policy "test_attempts: own" —
// for all, includes delete). Вызывается из «Последние пробники» на
// странице «Мой прогресс» после подтверждения через диалог.
export async function deleteAttempt(attemptId) {
  const { error } = await supabase.from('test_attempts').delete().eq('id', attemptId)
  if (error) {
    console.error('[attemptsService.deleteAttempt]', error)
    throw error
  }
}

// Удаляет ВСЕ попытки пользователя разом — для кнопки «Обнулить
// прогресс». RLS та же самая (own, for all), просто без .eq('id', ...).
export async function deleteAllAttempts(userId) {
  const { error } = await supabase.from('test_attempts').delete().eq('user_id', userId)
  if (error) {
    console.error('[attemptsService.deleteAllAttempts]', error)
    throw error
  }
}

// A single attempt, including its full answers_snapshot — for
// AttemptReview.jsx. RLS already scopes this to the current user, no
// need to pass userId here.
export async function getAttempt(attemptId) {
  try {
    const { data, error } = await supabase.from('test_attempts').select('*').eq('id', attemptId).single()
    if (error) throw error
    return data ? rowToAttempt(data) : null
  } catch (err) {
    console.error('[attemptsService.getAttempt]', err)
    return null
  }
}

// Per-exam summary for the "Прогресс по предметам" widget — how many
// distinct tests has the person completed at least once (out of
// `totalTests`, passed in by the caller since that count comes from
// testsService, not this table), and their average time per attempt.
// `attempts` here should already be scoped to one exam.
export function summarizeAttempts(attempts, totalTests) {
  const distinctTestIds = new Set(attempts.map((a) => a.testId))
  const avgSeconds = attempts.length
    ? Math.round(attempts.reduce((sum, a) => sum + a.durationSeconds, 0) / attempts.length)
    : 0
  return {
    completed: distinctTestIds.size,
    total: totalTests,
    avgMinutes: Math.round(avgSeconds / 60),
  }
}
