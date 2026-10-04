// ---------------------------------------------------------------------
// The person's personal vocabulary list (Словарь). See
// supabase/schema.sql for the `dictionary_words` table + RLS.
// ---------------------------------------------------------------------

import { supabase } from '../lib/supabaseClient.js'
import { logError } from '../lib/logger.js'

function toError(err) {
  return err instanceof Error ? err : new Error(err?.message || 'Неизвестная ошибка')
}

function rowToWord(row) {
  return {
    id: row.id,
    word: row.word,
    translation: row.translation || '',
    example: row.example || '',
    category: row.category || '',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

// All of the current user's saved words, newest first.
export async function listWords(userId) {
  try {
    const { data, error } = await supabase
      .from('dictionary_words')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
    if (error) throw error
    return (data || []).map(rowToWord)
  } catch (err) {
    logError('[dictionaryService.listWords]', err)
    return []
  }
}

export async function addWord({ userId, word, translation, example, category }) {
  try {
    const { data, error } = await supabase
      .from('dictionary_words')
      .insert({
        user_id: userId,
        word: word.trim(),
        translation: (translation || '').trim(),
        example: example?.trim() || null,
        category: category?.trim() || null,
      })
      .select()
      .single()
    if (error) throw error
    return rowToWord(data)
  } catch (err) {
    logError('[dictionaryService.addWord]', err)
    throw toError(err)
  }
}

export async function updateWord(id, patch) {
  try {
    const { error } = await supabase
      .from('dictionary_words')
      .update({
        ...(patch.word !== undefined ? { word: patch.word.trim() } : {}),
        ...(patch.translation !== undefined ? { translation: patch.translation.trim() } : {}),
        ...(patch.example !== undefined ? { example: patch.example?.trim() || null } : {}),
        ...(patch.category !== undefined ? { category: patch.category?.trim() || null } : {}),
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
    if (error) throw error
    return true
  } catch (err) {
    logError('[dictionaryService.updateWord]', err)
    throw toError(err)
  }
}

export async function deleteWord(id) {
  try {
    const { error } = await supabase.from('dictionary_words').delete().eq('id', id)
    if (error) throw error
    return true
  } catch (err) {
    logError('[dictionaryService.deleteWord]', err)
    throw toError(err)
  }
}

// Quick word/phrase translation for the "Перевести" button — this
// project doesn't have a paid translation API key configured, so this
// uses MyMemory (api.mymemory.translated.net), a free, keyless,
// CORS-friendly endpoint good enough for short lookups. Swap this one
// function for DeepL/Google Cloud Translate later if a real key gets
// added — nothing else in the app needs to change.
export async function translateText(text, { from = 'autodetect', to = 'ru' } = {}) {
  const trimmed = text.trim()
  if (!trimmed) return ''
  try {
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(trimmed)}&langpair=${from}|${to}`
    const res = await fetch(url)
    if (!res.ok) throw new Error(`Translation request failed (${res.status})`)
    const data = await res.json()
    const translated = data?.responseData?.translatedText
    if (!translated) throw new Error('Пустой ответ от сервиса перевода')
    return translated
  } catch (err) {
    logError('[dictionaryService.translateText]', err)
    throw toError(err)
  }
}

// A plain-text, tab-separated file — the format both Anki ("Import File",
// tab-delimited, field 1 = front, field 2 = back) and Quizlet ("Import
// from Word/Excel", term<TAB>definition per line) accept directly with
// no configuration needed on the person's end.
export function wordsToAnkiText(words) {
  return words.map((w) => `${w.word}\t${w.translation}`).join('\n')
}

export function downloadTextFile(filename, content) {
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
