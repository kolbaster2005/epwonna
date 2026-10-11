import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext.jsx'
import { IconCheckCircle } from '../components/Icons.jsx'
import heroIllustration from '../assets/hero-illustration.webp'

const BENEFITS = [
  'Прогресс по предметам — на любом устройстве',
  'Результаты всех пройденных пробников',
  'PRO-доступ привязывается к аккаунту',
]

// Полноценная страница входа/регистрации — живёт по адресу /auth,
// в отличие от AuthModal.jsx (модалка, всё ещё используется в
// TestPage.jsx: там переход на отдельную страницу потерял бы ответы
// человека, уже введённые в тест, поэтому именно там — оверлей поверх
// того же экрана). Остальные места (ProSidebar, Pricing, UpsellModal,
// LockedTestNotice, GuestNotice) ведут сюда — там терять нечего, а
// полноценная страница и адаптивнее, и просто приятнее модалки.
//
// state.from — куда вернуться после входа/регистрации (location.pathname
// того места, откуда пришли); state.reason — почему именно сейчас
// понадобился вход (тот же текст, что раньше показывался в AuthModal);
// state.mode — с какой вкладки открыть форму ('signin' | 'signup').
export default function AuthPage() {
  const { signIn, signUp, requestPasswordReset } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const from = location.state?.from || '/'
  const reason = location.state?.reason

  const [mode, setMode] = useState(location.state?.mode === 'signup' ? 'signup' : 'signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [signedUp, setSignedUp] = useState(false)
  const [resetSent, setResetSent] = useState(false)

  function goBack() {
    navigate(from, { replace: true })
  }

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
        setSignedUp(true)
      } else {
        await signIn(email, password)
        goBack()
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

  const done = signedUp || resetSent

  return (
    <div className="auth-page">
      <div className="auth-page-card">
        <div className="auth-page-form-col">
          {done ? (
            <>
              <h1>Проверьте почту</h1>
              <p className="auth-page-lead">
                {signedUp
                  ? `Мы отправили письмо на ${email} со ссылкой для подтверждения регистрации.`
                  : `Мы отправили письмо на ${email} со ссылкой для сброса пароля. Перейдите по ней, чтобы задать новый.`}
              </p>
              <button type="button" className="btn btn-primary auth-page-submit" onClick={goBack}>
                Понятно
              </button>
            </>
          ) : (
            <>
              <h1>{mode === 'reset' ? 'Восстановление пароля' : mode === 'signup' ? 'Создай аккаунт' : 'С возвращением'}</h1>
              <p className="auth-page-lead">
                {mode === 'reset'
                  ? 'Пришлём ссылку для сброса пароля на вашу почту.'
                  : mode === 'signup'
                    ? 'Это бесплатно — и займёт полминуты.'
                    : 'Войди, чтобы продолжить подготовку.'}
              </p>

              {mode !== 'reset' && (
                <div className="phase-switch auth-page-tabs">
                  <button
                    type="button"
                    className={'phase-switch-btn' + (mode === 'signin' ? ' active' : '')}
                    onClick={() => switchMode('signin')}
                  >
                    Вход
                  </button>
                  <button
                    type="button"
                    className={'phase-switch-btn' + (mode === 'signup' ? ' active' : '')}
                    onClick={() => switchMode('signup')}
                  >
                    Регистрация
                  </button>
                </div>
              )}

              {reason && <p className="auth-reset-hint">{reason}</p>}

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

                <button className="btn btn-primary auth-page-submit" type="submit" disabled={submitting}>
                  {submitting
                    ? 'Подождите…'
                    : mode === 'signin'
                      ? 'Войти'
                      : mode === 'signup'
                        ? 'Зарегистрироваться'
                        : 'Отправить ссылку'}
                </button>
              </form>

              {mode === 'reset' && (
                <button type="button" className="auth-switch" onClick={() => switchMode('signin')}>
                  ← Вернуться ко входу
                </button>
              )}

              <Link className="auth-page-back" to="/">← На главную</Link>
            </>
          )}
        </div>

        <div className="auth-page-art-col">
          <img src={heroIllustration} alt="" className="auth-page-art-img" />
          <div className="auth-page-benefits">
            <h2>Аккаунт хранит всю подготовку</h2>
            <ul>
              {BENEFITS.map((b) => (
                <li key={b}>
                  <IconCheckCircle size={18} /> {b}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
