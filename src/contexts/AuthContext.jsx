import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient.js'

// Pro-версия ещё не продаётся — пока просто список почт, у кого есть
// доступ к функциям для тренировки по теме/типу задания. Когда дойдёт
// до реальных платных подписок, это стоит заменить на столбец
// profiles.is_pro (или отдельную таблицу подписок), проверяемый и
// здесь, и на сервере в Edge Function — сейчас список специально
// хранится в двух местах (тут и в generate-practice-test/index.ts),
// чтобы сервер не доверял слепо тому, что говорит клиент.
const PRO_EMAILS = ['maksimmissuragin@gmail.com']

const AuthContext = createContext(null)

// See the identical helper (and comment) in services/testsService.js —
// "Failed to fetch" means the request never reached Supabase at all
// (bad/placeholder URL, dev server started before .env was filled in,
// ad-blocker, offline), which deserves a clearer message than the raw
// browser text.
function toError(err) {
  if (err instanceof TypeError && /fetch/i.test(err.message)) {
    return new Error(
      'Не удалось связаться с базой данных (Failed to fetch). Проверьте: 1) .env заполнен и dev-сервер ' +
        'перезапущен после этого (npm run dev), 2) в нём нет опечаток в VITE_SUPABASE_URL, ' +
        '3) блокировщики рекламы/антивирус не блокируют запросы к supabase.co.'
    )
  }
  return err instanceof Error ? err : new Error(err?.message || 'Не удалось выполнить запрос.')
}

// Supabase Auth возвращает ошибки на английском (raw текст от их
// сервера) — переводим самые частые в понятные сообщения. Если
// сообщение незнакомое, показываем его как есть (лучше английская
// строка, чем полное молчание о причине) вместо того чтобы прятать её
// за общим "что-то пошло не так".
const AUTH_ERROR_TRANSLATIONS = [
  [/invalid login credentials/i, 'Неверный email или пароль.'],
  [/email not confirmed/i, 'Email ещё не подтверждён — проверьте почту и перейдите по ссылке из письма.'],
  [/user already registered/i, 'Аккаунт с таким email уже существует — попробуйте войти вместо регистрации.'],
  [/password should be at least/i, 'Пароль должен быть не короче 6 символов.'],
  [/unable to validate email address/i, 'Некорректный формат email.'],
  [/for security purposes.*after (\d+) seconds/i, (m) => `Слишком много попыток подряд — подождите ${m[1]} секунд и попробуйте ещё раз.`],
  [/email rate limit exceeded/i, 'Слишком много писем отправлено на этот адрес за короткое время — подождите немного и попробуйте снова.'],
  [/user not found/i, 'Пользователь с таким email не найден.'],
  [/network/i, 'Проблема с сетью — проверьте подключение к интернету и попробуйте снова.'],
]

function toAuthError(err) {
  const base = toError(err)
  for (const [pattern, replacement] of AUTH_ERROR_TRANSLATIONS) {
    const match = base.message.match(pattern)
    if (match) {
      return new Error(typeof replacement === 'function' ? replacement(match) : replacement)
    }
  }
  return base
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  // The `profiles` row for the current user — holds `role` ('user' | 'admin').
  // Every new signup gets a row with role='user' by default via the
  // handle_new_user trigger in supabase/schema.sql; only a direct SQL
  // update (`update profiles set role='admin' where email=...`) promotes
  // someone to admin — there is no in-app way to self-promote, on purpose.
  const [profile, setProfile] = useState(null)
  const [profileLoading, setProfileLoading] = useState(false)

  useEffect(() => {
    supabase.auth
      .getSession()
      .then(({ data }) => setUser(data.session?.user ?? null))
      .catch((err) => console.error('[AuthContext.getSession]', err))
      .finally(() => setLoading(false))

    // Keeps `user` in sync across tabs and after token refresh, sign-in,
    // sign-out, etc. — anything that touches the session goes through
    // this one listener instead of every call site updating state itself.
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    return () => listener.subscription.unsubscribe()
  }, [])

  // Re-fetch the profile row whenever the logged-in user changes (login,
  // logout, or switching accounts) — this is what RequireAdmin and the
  // header's "Админка" link check.
  useEffect(() => {
    if (!user) {
      setProfile(null)
      return
    }
    let cancelled = false
    setProfileLoading(true)
    supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle()
      .then(({ data, error }) => {
        if (cancelled) return
        if (error) console.error('[AuthContext.profile]', error)
        setProfile(data ?? null)
      })
      .catch((err) => {
        if (!cancelled) console.error('[AuthContext.profile]', err)
      })
      .finally(() => {
        if (!cancelled) setProfileLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [user])

  async function signUp(email, password) {
    try {
      const { data, error } = await supabase.auth.signUp({ email, password })
      if (error) throw error
      return data
    } catch (err) {
      throw toAuthError(err)
    }
  }

  async function signIn(email, password) {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) throw error
      return data
    } catch (err) {
      throw toAuthError(err)
    }
  }

  async function signOut() {
    try {
      const { error } = await supabase.auth.signOut()
      if (error) throw error
    } catch (err) {
      throw toAuthError(err)
    }
  }

  // Отправляет письмо со ссылкой сброса пароля. redirectTo обязательно
  // должен быть в списке разрешённых Redirect URLs в настройках
  // Supabase (Authentication → URL Configuration) — иначе Supabase
  // сам молча отклонит переход по ссылке.
  async function requestPasswordReset(email) {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}${import.meta.env.BASE_URL}reset-password`,
      })
      if (error) throw error
    } catch (err) {
      throw toAuthError(err)
    }
  }

  // Вызывается со страницы, на которую ведёт ссылка из письма (см.
  // ResetPasswordPage.jsx) — к этому моменту у Supabase уже есть
  // временная recovery-сессия (устанавливается автоматически по
  // токену из URL), так что новый пароль просто обновляет её.
  async function updatePassword(newPassword) {
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword })
      if (error) throw error
    } catch (err) {
      throw toAuthError(err)
    }
  }

  // avatarKey is one of avatarOptions' ids (src/data/avatars.js) or null
  // for "no avatar". Updates the DB and local state together so the
  // circle in the header reflects the pick immediately, without waiting
  // for a re-fetch.
  async function updateAvatar(avatarKey) {
    if (!user) return
    try {
      const { error } = await supabase.from('profiles').update({ avatar_key: avatarKey }).eq('id', user.id)
      if (error) throw error
      setProfile((prev) => (prev ? { ...prev, avatar_key: avatarKey } : prev))
    } catch (err) {
      throw toError(err)
    }
  }

  const isAdmin = profile?.role === 'admin'
  const isPro = !!user?.email && PRO_EMAILS.includes(user.email)

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        profile,
        profileLoading,
        isAdmin,
        isPro,
        signUp,
        signIn,
        signOut,
        updateAvatar,
        requestPasswordReset,
        updatePassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}
