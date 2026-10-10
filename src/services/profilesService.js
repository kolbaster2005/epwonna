import { supabase } from '../lib/supabaseClient.js'
import { logError } from '../lib/logger.js'

// Условно "навсегда" — используется вместо null, чтобы "Выдать PRO"
// в /admin/users включало PRO сразу и на неопределённый срок. Сама
// длительность не связана с триггерами в schema.sql (в отличие от
// trial_pro_until) — тут просто обычное значение колонки, которое
// админ меняет через RLS-политику "profiles: admin update any".
export const INDEFINITE_PRO_UNTIL = '2099-12-31T23:59:59Z'

// Только для /admin/users (RequireAdmin) — непривилегированный клиент
// не увидит чужие строки, see "profiles: admin read all" в schema.sql.
export async function listAllProfiles() {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, email, role, created_at, trial_pro_until, admin_pro_until')
      .order('created_at', { ascending: false })
    if (error) throw error
    return (data || []).map((row) => ({
      id: row.id,
      email: row.email,
      role: row.role,
      createdAt: row.created_at,
      trialProUntil: row.trial_pro_until,
      adminProUntil: row.admin_pro_until,
    }))
  } catch (err) {
    logError('[profilesService.listAllProfiles]', err)
    return []
  }
}

// grant=true выдаёт PRO на неопределённый срок, grant=false забирает.
// Реально разрешает это только RLS ("profiles: admin update any") +
// триггер prevent_self_admin_pro_grant в schema.sql — не доверяем
// тому, что эту функцию можно вызвать только из админки.
export async function setAdminPro(userId, grant) {
  try {
    const { error } = await supabase
      .from('profiles')
      .update({ admin_pro_until: grant ? INDEFINITE_PRO_UNTIL : null })
      .eq('id', userId)
    if (error) throw error
    return true
  } catch (err) {
    logError('[profilesService.setAdminPro]', err)
    throw err instanceof Error ? err : new Error(err?.message || 'Не удалось изменить PRO-статус.')
  }
}
