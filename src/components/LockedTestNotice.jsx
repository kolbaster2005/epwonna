import { useState } from 'react'
import { Link } from 'react-router-dom'
import AuthModal from './AuthModal.jsx'
import { IconLock } from './Icons.jsx'

// Shown instead of the real test content on TestDetailPage/TestPage/
// OralTestPage whenever test.requiresAuth && !user — e.g. someone
// followed a direct link to a login-gated probnik without being signed
// in. Owns its own AuthModal state so every caller can just render
// <LockedTestNotice examKey={examKey} /> without wiring anything up.
export default function LockedTestNotice({ examKey }) {
  const [authOpen, setAuthOpen] = useState(false)
  return (
    <div className="test-missing">
      <IconLock size={30} className="test-missing-lock-icon" />
      <h1>Доступно только авторизованным</h1>
      <p>Чтобы открыть этот пробник, войдите или зарегистрируйтесь — это бесплатно.</p>
      <div className="test-missing-actions">
        <button type="button" className="btn btn-primary" onClick={() => setAuthOpen(true)}>
          Войти / Зарегистрироваться
        </button>
        <Link className="btn btn-outline" to={`/${examKey}`}>Вернуться к пробникам</Link>
      </div>
      {authOpen && <AuthModal onClose={() => setAuthOpen(false)} />}
    </div>
  )
}
