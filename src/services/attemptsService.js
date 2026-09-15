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
    updatedAt: row.updated_at,
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
        // completed_at has no DB default (see allow_draft_test_attempts.sql
        // — a draft row needs it to default to null instead), so a
        // finished attempt has to set it explicitly here.
        completed_at: new Date().toISOString(),
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

// All of the current user's FINISHED attempts, newest first — used for
// both the "Последние пробники" list (sliced to a handful) and the trend
// chart (reversed to chronological order there). In-progress drafts
// (completed_at is null — see saveDraftAttempt below) never belong here.
export async function listAttempts(userId) {
  try {
    const { data, error } = await supabase
      .from('test_attempts')
      .select('*')
      .eq('user_id', userId)
      .not('completed_at', 'is', null)
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

// ---------------------------------------------------------------------
// Draft (in-progress) attempts — "продолжить незавершённый пробник".
// A draft is a test_attempts row with completed_at still null; TestPage.jsx
// autosaves one periodically while the person is answering, and turns it
// into a real finished row (saveAttempt) or discards it, never both.
// ---------------------------------------------------------------------

// Autosaved every couple of seconds from TestPage.jsx (debounced) and
// once more on tab-close/visibility-change — never call this after the
// test has already been finished. Fire-and-forget from the caller: a
// missed autosave shouldn't interrupt someone mid-test.
export async function saveDraftAttempt({ userId, testId, examKey, testTitle, answersSnapshot, durationSeconds }) {
  try {
    const existing = await getDraftRow(userId, testId)
    const patch = {
      duration_seconds: durationSeconds,
      answers_snapshot: answersSnapshot ?? null,
      updated_at: new Date().toISOString(),
    }
    if (existing) {
      const { error } = await supabase.from('test_attempts').update(patch).eq('id', existing.id)
      if (error) throw error
    } else {
      const { error } = await supabase.from('test_attempts').insert({
        user_id: userId,
        test_id: testId,
        exam_key: examKey,
        test_title: testTitle,
        completed_at: null,
        ...patch,
      })
      if (error) throw error
    }
  } catch (err) {
    console.error('[attemptsService.saveDraftAttempt]', err)
  }
}

async function getDraftRow(userId, testId) {
  const { data, error } = await supabase
    .from('test_attempts')
    .select('id')
    .eq('user_id', userId)
    .eq('test_id', testId)
    .is('completed_at', null)
    .maybeSingle()
  if (error) throw error
  return data
}

// The in-progress draft for this (user, test) pair, if any — null if
// there isn't one. Called when TestPage.jsx opens a probnik, to offer
// "продолжить?" instead of silently starting over.
export async function getDraftAttempt(userId, testId) {
  try {
    const { data, error } = await supabase
      .from('test_attempts')
      .select('*')
      .eq('user_id', userId)
      .eq('test_id', testId)
      .is('completed_at', null)
      .maybeSingle()
    if (error) throw error
    return data ? rowToAttempt(data) : null
  } catch (err) {
    console.error('[attemptsService.getDraftAttempt]', err)
    return null
  }
}

// Called right after a successful saveAttempt() (the draft is now a
// finished attempt, no reason to keep it around) and on an explicit
// "Начать заново" (the draft's answers are being thrown away).
export async function deleteDraftAttempt(userId, testId) {
  try {
    const { error } = await supabase
      .from('test_attempts')
      .delete()
      .eq('user_id', userId)
      .eq('test_id', testId)
      .is('completed_at', null)
    if (error) throw error
  } catch (err) {
    console.error('[attemptsService.deleteDraftAttempt]', err)
  }
}
