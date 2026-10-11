import { Link, useLocation, useNavigate } from 'react-router-dom'
import { IconLock } from './Icons.jsx'

// Shown instead of the real test content on TestDetailPage/TestPage/
// OralTestPage whenever test.requiresAuth && !user — e.g. someone
// followed a direct link to a login-gated probnik without being signed
// in. "Войти / Зарегистрироваться" sends to /auth (see AuthPage.jsx),
// which returns here after a successful sign-in/sign-up.
export default function LockedTestNotice({ examKey }) {
  const navigate = useNavigate()
  const location = useLocation()
  return (
    <div className="test-missing">
      <IconLock size={30} className="test-missing-lock-icon" />
      <h1>Доступно только авторизованным</h1>
      <p>Чтобы открыть этот пробник, войдите или зарегистрируйтесь — это бесплатно.</p>
      <div className="test-missing-actions">
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => navigate('/auth', { state: { from: location.pathname } })}
        >
          Войти / Зарегистрироваться
        </button>
        <Link className="btn btn-outline" to={`/${examKey}`}>Вернуться к пробникам</Link>
      </div>
    </div>
  )
}
