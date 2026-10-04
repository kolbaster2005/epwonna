// ---------------------------------------------------------------------
// Виджет «До экзаменов» (ProDashboard.jsx): дата ближайшего экзамена и
// статус регистрации — задаются админом на /admin/exam-countdown. См.
// supabase/exam_countdown.sql (таблица из одной строки, id = 1;
// public read, admin write).
// ---------------------------------------------------------------------

import { supabase } from '../lib/supabaseClient.js'

function toError(err) {
  return err instanceof Error ? err : new Error(err?.message || 'Неизвестная ошибка')
}

// { examDate: 'YYYY-MM-DD' | null, registrationOpen: boolean }, или null,
// если прочитать не удалось (виджет тогда просто не показывается).
export async function getExamCountdown() {
  try {
    const { data, error } = await supabase.from('exam_countdown').select('*').eq('id', 1).maybeSingle()
    if (error) throw error
    return { examDate: data?.exam_date ?? null, registrationOpen: data?.registration_open ?? false }
  } catch (err) {
    console.error('[examCountdownService.getExamCountdown]', err)
    return null
  }
}

export async function saveExamCountdown({ examDate, registrationOpen }) {
  try {
    const { error } = await supabase.from('exam_countdown').upsert({
      id: 1,
      exam_date: examDate || null,
      registration_open: registrationOpen,
      updated_at: new Date().toISOString(),
    })
    if (error) throw error
  } catch (err) {
    console.error('[examCountdownService.saveExamCountdown]', err)
    throw toError(err)
  }
}

// Сколько полных дней от сегодня до 'YYYY-MM-DD' (0 — экзамен сегодня,
// отрицательное — уже прошёл). Дата разбирается как местная полночь:
// new Date('YYYY-MM-DD') дал бы UTC-полночь и сдвиг на день в поясах
// восточнее Гринвича.
export function daysUntil(isoDate, fromDate = new Date()) {
  const [y, m, d] = isoDate.split('-').map(Number)
  const target = new Date(y, m - 1, d)
  const today = new Date(fromDate.getFullYear(), fromDate.getMonth(), fromDate.getDate())
  // round, а не floor — переход на летнее/зимнее время даёт сутки по 23/25 ч.
  return Math.round((target - today) / 86400000)
}
