// ---------------------------------------------------------------------
// Per-exam topic list (used for the topic filter on ExamPage and the
// "Тема" field in the admin test editor). Used to be hardcoded in
// src/data/examData.js — now a real, admin-editable table. See
// supabase/schema.sql for the `topics` table + RLS (public read, admin
// write).
// ---------------------------------------------------------------------

import { supabase } from '../lib/supabaseClient.js'

function toError(err) {
  return err instanceof Error ? err : new Error(err?.message || 'Неизвестная ошибка')
}

function rowToTopic(row) {
  return { id: row.id, label: row.label, sortOrder: row.sort_order }
}

export async function listTopics(examKey) {
  try {
    const { data, error } = await supabase
      .from('topics')
      .select('*')
      .eq('exam_key', examKey)
      .order('sort_order', { ascending: true })
    if (error) throw error
    return (data || []).map(rowToTopic)
  } catch (err) {
    console.error('[topicsService.listTopics]', err)
    return []
  }
}

export async function createTopic({ examKey, id, label, sortOrder }) {
  try {
    const { error } = await supabase
      .from('topics')
      .insert({ exam_key: examKey, id: id.trim(), label: label.trim(), sort_order: sortOrder ?? 0 })
    if (error) throw error
    return true
  } catch (err) {
    console.error('[topicsService.createTopic]', err)
    throw toError(err)
  }
}

export async function updateTopic(examKey, id, patch) {
  try {
    const { error } = await supabase
      .from('topics')
      .update({
        ...(patch.label !== undefined ? { label: patch.label } : {}),
        ...(patch.sortOrder !== undefined ? { sort_order: patch.sortOrder } : {}),
      })
      .eq('exam_key', examKey)
      .eq('id', id)
    if (error) throw error
    return true
  } catch (err) {
    console.error('[topicsService.updateTopic]', err)
    throw toError(err)
  }
}

export async function deleteTopic(examKey, id) {
  try {
    const { error } = await supabase.from('topics').delete().eq('exam_key', examKey).eq('id', id)
    if (error) throw error
    return true
  } catch (err) {
    console.error('[topicsService.deleteTopic]', err)
    throw toError(err)
  }
}

// ---------------------------------------------------------------------
// Тема на уровне ОТДЕЛЬНОГО задания (task_topics, many-to-many) — не
// путать с listTopics/createTopic/etc выше, которые про сам список
// доступных тем для экзамена. Эти два — про то, какие темы выбраны у
// конкретного вопроса.
// ---------------------------------------------------------------------

// Batch fetch — one query for every question of a test being opened in
// the admin editor, instead of one query per question.
export async function listTaskTopicsFor(taskIds) {
  if (!taskIds?.length) return {}
  try {
    const { data, error } = await supabase.from('task_topics').select('*').in('task_id', taskIds)
    if (error) throw error
    const map = {}
    for (const row of data || []) {
      if (!map[row.task_id]) map[row.task_id] = []
      map[row.task_id].push(row.topic_id)
    }
    return map
  } catch (err) {
    console.error('[topicsService.listTaskTopicsFor]', err)
    return {}
  }
}

// Replace-all — simplest correct approach given how few topics a single
// task ever has (a handful at most): delete whatever was there, insert
// the current selection. Called once per question on save, not on every
// checkbox click.
export async function setTaskTopics(taskId, topicIds) {
  try {
    const { error: delError } = await supabase.from('task_topics').delete().eq('task_id', taskId)
    if (delError) throw delError
    if (topicIds?.length) {
      const { error: insError } = await supabase
        .from('task_topics')
        .insert(topicIds.map((topicId) => ({ task_id: taskId, topic_id: topicId })))
      if (insError) throw insError
    }
    return true
  } catch (err) {
    console.error('[topicsService.setTaskTopics]', err)
    throw toError(err)
  }
}
