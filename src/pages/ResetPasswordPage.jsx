import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext.jsx'
import { supabase } from '../lib/supabaseClient.js'

// Landing page for the link in the "Забыли пароль?" email (see
// AuthContext.requestPasswordReset). Supabase reads a recovery token
// straight out of the URL itself and turns it into a temporary
// session — nothing here needs to parse the URL by hand — but that
// happens async via onAuthStateChange, so this page waits for a
// PASSWORD_RECOVERY (or an already-active session, in case the event
// fired before this component mounted) before showing the form.
export default function ResetPasswordPage() {
  const { updatePassword } = useAuth()
  const [ready, setReady] = useState(false)
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)

  useEffect(() => {
    let cancelled = false
    supabase.auth.getSession().then(({ data }) => {
      if (!cancelled && data.session) setReady(true)
    })
    const { data: listener } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') setReady(true)
    })
    return () => {
      cancelled = true
      listener.subscription.unsubscribe()
    }
  }, [])

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (password.length < 6) {
      setError('Пароль должен быть не короче 6 символов.')
      return
    }
    if (password !== confirm) {
      setError('Пароли не совпадают.')
      return
    }
    setSubmitting(true)
    try {
      await updatePassword(password)
      setDone(true)
    } catch (err) {
      setError(err.message || 'Не удалось обновить пароль. Попробуйте запросить ссылку заново.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="notfound-page reset-password-page">
      <h1>Новый пароль</h1>

      {done ? (
        <>
          <p>Пароль обновлён. Теперь можно пользоваться сайтом как обычно.</p>
          <div className="notfound-actions">
            <Link className="btn btn-primary" to="/">На главную</Link>
          </div>
        </>
      ) : !ready ? (
        <p>Проверяем ссылку…</p>
      ) : (
        <form className="auth-form reset-password-form" onSubmit={handleSubmit}>
          <label className="admin-field">
            <span>Новый пароль</span>
            <input
              type="password"
              required
              minLength={6}
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>
          <label className="admin-field">
            <span>Повторите пароль</span>
            <input
              type="password"
              required
              minLength={6}
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
            />
          </label>

          {error && <p className="auth-error">{error}</p>}

          <button className="btn btn-primary" style={{ justifyContent: 'center' }} type="submit" disabled={submitting}>
            {submitting ? 'Сохраняем…' : 'Сохранить пароль'}
          </button>
        </form>
      )}
    </div>
  )
}
