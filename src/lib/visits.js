import { supabase } from './supabaseClient.js'

const VISITOR_ID_KEY = 'epwonna-visitor-id'
// Set once, manually, from the "Не учитывать мои визиты" button on the
// admin stats page (see AdminStats.jsx) — lives in localStorage, not
// tied to being logged in, so it also covers testing done while
// logged out (checking the signup flow, browsing as a guest, etc.).
const EXCLUDE_KEY = 'epwonna-exclude-from-stats'

// Random id kept in this browser, not tied to any identity — exists
// purely so "same person came back" can be told apart from "new
// person" when counting unique visits. No cookies, no third party.
function getVisitorId() {
  try {
    let id = localStorage.getItem(VISITOR_ID_KEY)
    if (!id) {
      id = crypto.randomUUID()
      localStorage.setItem(VISITOR_ID_KEY, id)
    }
    return id
  } catch {
    // localStorage blocked (private mode etc.) — fall back to a
    // per-page-load id; this visit still gets counted, just won't be
    // recognized as a returning visitor on the next page.
    return crypto.randomUUID()
  }
}

export function isExcludedFromStats() {
  try {
    return localStorage.getItem(EXCLUDE_KEY) === 'true'
  } catch {
    return false
  }
}

export function excludeThisDeviceFromStats() {
  try {
    localStorage.setItem(EXCLUDE_KEY, 'true')
  } catch {
    // ignore — worst case this one device keeps being counted
  }
}

export function includeThisDeviceInStats() {
  try {
    localStorage.removeItem(EXCLUDE_KEY)
  } catch {
    // ignore
  }
}

// Fire-and-forget — a failed insert (offline, RLS misconfigured, table
// missing because the migration hasn't been run yet) should never break
// the page for the person visiting it.
export function recordPageView(path, userId) {
  if (isExcludedFromStats()) return
  try {
    supabase
      .from('page_views')
      .insert({ visitor_id: getVisitorId(), user_id: userId ?? null, path })
      .then(({ error }) => {
        if (error) console.error('[visits.recordPageView]', error)
      })
  } catch (err) {
    console.error('[visits.recordPageView]', err)
  }
}
