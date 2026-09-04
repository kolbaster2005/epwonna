// ---------------------------------------------------------------------
// Per-exam list of exam parts (Leseverstehen/Grammatik/... or
// Reading/Language in Use/...). Used to be hardcoded as exam.categories
// in src/data/examData.js — now a real, admin-editable table, same
// pattern as topicsService.js. See supabase/schema.sql section 9.2 for
// the `exam_parts` table + RLS (public read, admin write) and the
// backfill from existing questions.category values.
// ---------------------------------------------------------------------

import { supabase } from '../lib/supabaseClient.js'

function toError(err) {
  return err instanceof Error ? err : new Error(err?.message || 'Неизвестная ошибка')
}

function rowToExamPart(row) {
  return { id: row.id, label: row.label, sortOrder: row.sort_order }
}

export async function listExamParts(examKey) {
  try {
    const { data, error } = await supabase
      .from('exam_parts')
      .select('*')
      .eq('exam_key', examKey)
      .order('sort_order', { ascending: true })
    if (error) throw error
    return (data || []).map(rowToExamPart)
  } catch (err) {
    console.error('[examPartsService.listExamParts]', err)
    return []
  }
}

export async function createExamPart({ examKey, id, label, sortOrder }) {
  try {
    const { error } = await supabase
      .from('exam_parts')
      .insert({ exam_key: examKey, id: id.trim(), label: label.trim(), sort_order: sortOrder ?? 0 })
    if (error) throw error
    return true
  } catch (err) {
    console.error('[examPartsService.createExamPart]', err)
    throw toError(err)
  }
}

export async function updateExamPart(examKey, id, patch) {
  try {
    const { error } = await supabase
      .from('exam_parts')
      .update({
        ...(patch.label !== undefined ? { label: patch.label } : {}),
        ...(patch.sortOrder !== undefined ? { sort_order: patch.sortOrder } : {}),
      })
      .eq('exam_key', examKey)
      .eq('id', id)
    if (error) throw error
    return true
  } catch (err) {
    console.error('[examPartsService.updateExamPart]', err)
    throw toError(err)
  }
}

export async function deleteExamPart(examKey, id) {
  try {
    const { error } = await supabase.from('exam_parts').delete().eq('exam_key', examKey).eq('id', id)
    if (error) throw error
    return true
  } catch (err) {
    console.error('[examPartsService.deleteExamPart]', err)
    throw toError(err)
  }
}
