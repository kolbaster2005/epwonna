import { useLocation, useNavigate } from 'react-router-dom'
import { IconLogin } from './Icons.jsx'

// Общая заглушка "Войдите, чтобы..." для разделов личного кабинета,
// недоступных гостю (Словарь, Мои сочинения, Мой прогресс,
// Персонализация) — раньше это была голая строка текста на зелёном
// фоне (.admin-note, см. _admin.scss), а .admin-note используется ещё
// в десятке мест как мелкая инлайн-подсказка, так что просто
// перекрасить его было нельзя. Здесь — тот же вид, что и у карточек
// "пока пусто" (.dict-empty и т.п.), плюс кнопка входа на месте — ведёт
// на /auth (см. AuthPage.jsx) с возвратом на эту же страницу после входа.
export default function GuestNotice({ message }) {
  const navigate = useNavigate()
  const location = useLocation()
  return (
    <div className="guest-notice">
      <IconLogin size={28} />
      <p>{message}</p>
      <button type="button" className="btn btn-primary" onClick={() => navigate('/auth', { state: { from: location.pathname } })}>
        Войти
      </button>
    </div>
  )
}
