import { supabase } from '../lib/supabaseClient.js'

// Fetches content rows by id and reshapes them to exactly the shape
// TestPage.jsx already expects for a passage ({id, title, text,
// category, audioUrl}) — content.body becomes .text so the rest of the
// passage-rendering code (FloatingPassageWindow, the split view, etc.)
// doesn't need to know or care whether a given text (or audio, for
// Hörverstehen) came from the old embedded test.passages or the newer
// content table.
export async function listContentByIds(ids) {
  const uniqueIds = [...new Set((ids || []).filter(Boolean))]
  if (uniqueIds.length === 0) return []
  try {
    const { data, error } = await supabase.from('content').select('*').in('id', uniqueIds)
    if (error) throw error
    return (data || []).map((row) => ({
      id: row.id,
      title: row.title,
      text: row.body ?? undefined,
      category: row.category ?? undefined,
      audioUrl: row.audio_url ?? undefined,
    }))
  } catch (err) {
    console.error('[contentService.listContentByIds]', err)
    return []
  }
}

// ---- Admin-only: browsing/creating reusable content -------------------
// (task-bank texts and audio — one content row can be linked from any
// number of questions via question.content_id, across any number of
// tests, unlike tests.passages which only ever belongs to one test.)

export async function listContentForExam(examKey) {
  try {
    const { data, error } = await supabase
      .from('content')
      .select('id, title, category, audio_url, body')
      .eq('exam_key', examKey)
      .order('created_at', { ascending: false })
    if (error) throw error
    return data || []
  } catch (err) {
    console.error('[contentService.listContentForExam]', err)
    return []
  }
}

// Uploads straight to the listening-audio bucket and returns its public
// URL. RLS on storage.objects only allows this for admins (see
// supabase/listening_audio_storage.sql) — a non-admin's upload attempt
// is rejected by Supabase itself, not merely hidden by not showing this
// UI to them.
export async function uploadListeningAudio(file) {
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '-')
  const path = `${Date.now()}-${safeName}`
  const { error } = await supabase.storage.from('listening-audio').upload(path, file, {
    cacheControl: '3600',
    upsert: false,
  })
  if (error) throw error
  const { data } = supabase.storage.from('listening-audio').getPublicUrl(path)
  return data.publicUrl
}

export async function createContent({ examKey, title, category, audioUrl, body }) {
  const { data, error } = await supabase
    .from('content')
    .insert({
      exam_key: examKey,
      title: title || null,
      category: category || null,
      audio_url: audioUrl || null,
      body: body || null,
    })
    .select()
    .single()
  if (error) throw error
  return data
}
