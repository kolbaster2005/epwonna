import { supabase } from '../lib/supabaseClient.js'

// Fetches content rows by id and reshapes them to exactly the shape
// TestPage.jsx already expects for a passage ({id, title, text,
// category}) — content.body becomes .text so the rest of the passage-
// rendering code (FloatingPassageWindow, the split view, etc.) doesn't
// need to know or care whether a given text came from the old embedded
// test.passages or the newer content table.
export async function listContentByIds(ids) {
  const uniqueIds = [...new Set((ids || []).filter(Boolean))]
  if (uniqueIds.length === 0) return []
  try {
    const { data, error } = await supabase.from('content').select('*').in('id', uniqueIds)
    if (error) throw error
    return (data || []).map((row) => ({
      id: row.id,
      title: row.title,
      text: row.body,
      category: row.category ?? undefined,
    }))
  } catch (err) {
    console.error('[contentService.listContentByIds]', err)
    return []
  }
}
