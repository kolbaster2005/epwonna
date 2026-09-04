// ---------------------------------------------------------------------
// Written answers to `essay_choice` questions (Schreibaufgabe: pick one
// of two prompts, write a free-form answer). Never auto-graded — this
// table exists purely so a person can come back later and re-read what
// they wrote, under МОЁ ОБУЧЕНИЕ → «Мои сочинения». See
// supabase/schema.sql for the `essay_submissions` table + RLS.
// ---------------------------------------------------------------------

import { supabase } from '../lib/supabaseClient.js'

function toError(err) {
  return err instanceof Error ? err : new Error(err?.message || 'Неизвестная ошибка')
}

function rowToSubmission(row) {
  return {
    id: row.id,
    testId: row.test_id,
    questionId: row.question_id,
    examKey: row.exam_key,
    choiceId: row.choice_id,
    choiceTitle: row.choice_title ?? undefined,
    text: row.text,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

// Called once an essay_choice question locks (TestPage.jsx's
// lockCurrentIfComplete) — upserts on (user_id, question_id, test_id)
// so redoing the same question in the SAME test overwrites the
// previous submission, but the same underlying task reused in a
// DIFFERENT test (task-bank reuse via test_tasks) gets its own
// independent submission instead of overwriting/leaking across tests.
export async function saveEssaySubmission({ userId, testId, questionId, examKey, choiceId, choiceTitle, text }) {
  try {
    const { error } = await supabase.from('essay_submissions').upsert(
      {
        user_id: userId,
        test_id: testId,
        question_id: questionId,
        exam_key: examKey,
        choice_id: choiceId,
        choice_title: choiceTitle ?? null,
        text,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,question_id,test_id' }
    )
    if (error) throw error
    return true
  } catch (err) {
    console.error('[essaysService.saveEssaySubmission]', err)
    throw toError(err)
  }
}

// All of the current user's saved essays, newest-edited first — fails
// soft (empty list) so a loading MyLearning page doesn't hang if this
// one query has a hiccup.
export async function listEssaySubmissions(userId) {
  try {
    const { data, error } = await supabase
      .from('essay_submissions')
      .select('*')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false })
    if (error) throw error
    return (data || []).map(rowToSubmission)
  } catch (err) {
    console.error('[essaysService.listEssaySubmissions]', err)
    return []
  }
}

export async function deleteEssaySubmission(id) {
  try {
    const { error } = await supabase.from('essay_submissions').delete().eq('id', id)
    if (error) throw error
    return true
  } catch (err) {
    console.error('[essaysService.deleteEssaySubmission]', err)
    throw toError(err)
  }
}
