import { createClient } from '@supabase/supabase-js'
import { logError } from './logger.js'

// Reduced to just the origin (protocol + host), whatever else was typed
// in .env — supabase-js appends /rest/v1, /auth/v1, etc. itself, so any
// path (e.g. someone pasting .../rest/v1/ instead of the bare Project
// URL) would otherwise double up into requests like
// ".../rest/v1/auth/v1/signup" and fail with a 404 or
// "Invalid path specified in request URL". This makes that whole class
// of paste-in mistake impossible instead of just documenting it.
const rawUrl = (import.meta.env.VITE_SUPABASE_URL ?? '').trim()
let url = ''
try {
  url = rawUrl ? new URL(rawUrl).origin : ''
} catch {
  logError(`[supabase] VITE_SUPABASE_URL похож на некорректный адрес: "${rawUrl}". Ожидается вид https://<project-ref>.supabase.co, без пути и без слэша на конце.`)
}
const anonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY ?? '').trim()

if (!url || !anonKey) {
  // Loud in dev, doesn't crash the build — every page that hits the DB
  // will fail its request and show an empty/error state instead of a
  // white screen, which is easier to debug than a thrown error at import
  // time. See README → "Подключение к Supabase" for setup steps.
  logError(
    '[supabase] VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY не заданы. ' +
      'Скопируйте .env.example в .env и вставьте ключи вашего проекта Supabase.'
  )
}

// createClient() throws synchronously on an empty/invalid URL, which
// would white-screen the whole app before the logError() above is even
// useful. Falling back to a syntactically valid placeholder lets
// the app render normally; real requests against it will just fail
// (handled per-call in testsService.js / AuthContext.jsx) instead of
// crashing at import time.
export const supabase = createClient(url || 'https://placeholder.supabase.co', anonKey || 'placeholder-anon-key')
