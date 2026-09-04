import { supabase } from '../lib/supabaseClient.js'

// Upserts the latest result for one task. Called from TestPage.jsx
// whenever a question gets checked (verdict computed then) and again
// whenever its self-grade changes afterwards (free_text/essay_choice/
// an all-freeText qa_table) — those start at 'ungraded' right after
// "Ответить" and only get a real verdict once the person self-grades,
// so this needs to fire at both points, not just the first.
// Silently no-ops when there's no user (matches the rest of the app's
// "progress only persists when logged in" pattern) or when the verdict
// isn't one of the four the DB accepts (e.g. null while nothing's
// checked yet — callers already guard for this, but a defensive check
// here costs nothing).
export async function upsertTaskAttempt({ userId, taskId, examKey, verdict, answer }) {
  if (!userId || !['correct', 'partial', 'incorrect', 'ungraded'].includes(verdict)) return false
  try {
    const { error } = await supabase
      .from('task_attempts')
      .upsert(
        { user_id: userId, task_id: taskId, exam_key: examKey, verdict, answer: answer ?? null, completed_at: new Date().toISOString() },
        { onConflict: 'user_id,task_id' }
      )
    if (error) throw error
    return true
  } catch (err) {
    console.error('[taskAttemptsService.upsertTaskAttempt]', err)
    return false
  }
}

// Every task this user has ever solved for this exam, keyed by task_id
// for O(1) "already solved?" lookups — the thing the future "Сгенерировать
// пробник" button and the per-topic progress widget both need.
export async function listTaskAttempts(userId, examKey) {
  if (!userId) return {}
  try {
    const { data, error } = await supabase
      .from('task_attempts')
      .select('task_id, verdict, completed_at')
      .eq('user_id', userId)
      .eq('exam_key', examKey)
    if (error) throw error
    return Object.fromEntries((data || []).map((row) => [row.task_id, row]))
  } catch (err) {
    console.error('[taskAttemptsService.listTaskAttempts]', err)
    return {}
  }
}

const CATEGORY_KEY = { Чтение: 'reading', Грамматика: 'grammar', Письмо: 'writing' }

// Per-topic progress: for every topic that has at least one task, how
// many of its Чтение/Грамматика/Письмо tasks this user has already
// done vs. how many exist in total. "Done" here means "has any row in
// task_attempts" — same convention as the existing whole-probnik
// progress (counts a completed attempt regardless of score), not just
// the ones marked correct.
export async function getTopicProgress(userId, examKey, allTasks, topics) {
  const attempts = await listTaskAttempts(userId, examKey)
  const solvedIds = new Set(Object.keys(attempts))

  const rows = {}
  for (const t of topics) {
    rows[t.id] = {
      label: t.label,
      reading: { solved: 0, total: 0 },
      grammar: { solved: 0, total: 0 },
      writing: { solved: 0, total: 0 },
    }
  }

  for (const task of allTasks) {
    const key = CATEGORY_KEY[task.category]
    if (!key) continue
    for (const topicId of task.topicIds || []) {
      if (!rows[topicId]) continue
      rows[topicId][key].total += 1
      if (solvedIds.has(task.id)) rows[topicId][key].solved += 1
    }
  }

  // Только темы, где реально есть хоть одно задание — иначе виджет
  // покажет пустые строки для тем без единого занесённого задания.
  return Object.fromEntries(Object.entries(rows).filter(([, r]) => r.reading.total + r.grammar.total + r.writing.total > 0))
}
