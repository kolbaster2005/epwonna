import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext.jsx'
import ModalOverlay from './ModalOverlay.jsx'

export default function AuthModal({ onClose, reason }) {
  const { signIn, signUp, requestPasswordReset } = useAuth()
  const [mode, setMode] = useState('signin') // 'signin' | 'signup' | 'reset'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [signedUp, setSignedUp] = useState(false)
  const [resetSent, setResetSent] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      if (mode === 'reset') {
        await requestPasswordReset(email)
        setResetSent(true)
      } else if (mode === 'signup') {
        await signUp(email, password)
        // Supabase's default project settings require confirming the
        // email before the session is active — the person won't be
        // logged in immediately after this, so say so instead of
        // silently closing the modal as if nothing happened.
        setSignedUp(true)
      } else {
        await signIn(email, password)
        onClose()
      }
    } catch (err) {
      setError(err.message || 'Что-то пошло не так. Попробуйте ещё раз.')
    } finally {
      setSubmitting(false)
    }
  }

  function switchMode(next) {
    setMode(next)
    setError('')
  }

  return (
    <ModalOverlay onClose={onClose}>
      <div className="modal auth-modal">
        <button className="modal-close" onClick={onClose} aria-label="Закрыть">✕</button>

        {signedUp ? (
          <>
            <h3>Проверьте почту</h3>
            <p>Мы отправили письмо на {email} со ссылкой для подтверждения регистрации.</p>
            <div className="modal-actions">
              <button className="btn btn-primary" style={{ flex: 1, justifyContent: 'center' }} onClick={onClose}>
                Понятно
              </button>
            </div>
          </>
        ) : resetSent ? (
          <>
            <h3>Проверьте почту</h3>
            <p>Мы отправили письмо на {email} со ссылкой для сброса пароля. Перейдите по ней, чтобы задать новый.</p>
            <div className="modal-actions">
              <button className="btn btn-primary" style={{ flex: 1, justifyContent: 'center' }} onClick={onClose}>
                Понятно
              </button>
            </div>
          </>
        ) : (
          <>
            <h3>{mode === 'signin' ? 'Вход' : mode === 'signup' ? 'Регистрация' : 'Восстановление пароля'}</h3>
            {mode !== 'reset' && reason && <p className="auth-reset-hint">{reason}</p>}
            {mode === 'reset' && <p className="auth-reset-hint">Пришлём ссылку для сброса пароля на вашу почту.</p>}

            <form className="auth-form" onSubmit={handleSubmit}>
              <label className="admin-field">
                <span>Email</span>
                <input type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
              </label>

              {mode !== 'reset' && (
                <label className="admin-field">
                  <span>Пароль</span>
                  <input
                    type="password"
                    required
                    minLength={6}
                    autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </label>
              )}

              {mode === 'signin' && (
                <button type="button" className="auth-forgot" onClick={() => switchMode('reset')}>
                  Забыли пароль? :(
                </button>
              )}

              {error && <p className="auth-error">{error}</p>}

              <button className="btn btn-primary" style={{ justifyContent: 'center' }} type="submit" disabled={submitting}>
                {submitting
                  ? 'Подождите…'
                  : mode === 'signin'
                    ? 'Войти'
                    : mode === 'signup'
                      ? 'Зарегистрироваться'
                      : 'Отправить ссылку'}
              </button>
            </form>

            {mode === 'reset' ? (
              <button type="button" className="auth-switch" onClick={() => switchMode('signin')}>
                ← Вернуться ко входу
              </button>
            ) : (
              <button type="button" className="auth-switch" onClick={() => switchMode(mode === 'signin' ? 'signup' : 'signin')}>
                {mode === 'signin' ? 'Нет аккаунта? Зарегистрироваться' : 'Уже есть аккаунт? Войти'}
              </button>
            )}
          </>
        )}
      </div>
    </ModalOverlay>
  )
}
