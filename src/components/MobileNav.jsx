import { useState } from 'react'
import { Link } from 'react-router-dom'
import { visibleExamList } from '../data/examData.js'
import { universities } from '../data/universities.js'
import { useAuth } from '../contexts/AuthContext.jsx'
import AuthModal from './AuthModal.jsx'

export default function MobileNav({ onClose }) {
  const { user, isAdmin, signOut } = useAuth()
  const [authOpen, setAuthOpen] = useState(false)
  const examList = visibleExamList(isAdmin)

  return (
    <div className="mobile-nav">
      <div className="mnav-top">
        <b style={{ fontFamily: "'Manrope',sans-serif", fontWeight: 800, fontSize: 18 }}>EP WONNA</b>
        <div className="mnav-top-actions">
          {/* The header's own avatar/"Войти" button sits to the left of the
              burger toggle (see Header.jsx .header-actions) — with the
              drawer open full-screen over the header, that button becomes
              unreachable, so the same "Войти"/"Выйти" control gets the
              same spot here, left of this drawer's own close button. */}
          {user ? (
            <button type="button" className="btn btn-outline btn-sm" onClick={signOut}>
              Выйти
            </button>
          ) : (
            <button type="button" className="btn btn-outline btn-sm" onClick={() => setAuthOpen(true)}>
              Войти
            </button>
          )}
          <button className="modal-close" style={{ position: 'static' }} onClick={onClose} aria-label="Закрыть">
            ✕
          </button>
        </div>
      </div>

      <Link className="mtop-link" to="/" onClick={onClose}>Главная</Link>

      {/* Group headings — no page of their own, just a label above the
          pages that already exist (see App.jsx). */}
      <span className="mnav-group-label">EP – экзамены</span>
      <div className="msub">
        {examList.map((exam) => (
          <Link to={`/${exam.key}`} key={exam.key} onClick={onClose}>{exam.label}</Link>
        ))}
      </div>

      {/* "Вступительные в вузы" temporarily hidden per product decision —
          delete this comment + the closing one below to bring it back.
      <span className="mnav-group-label">Вступительные в вузы</span>
      <div className="msub">
        {universities.map((uni) => (
          <Link to={`/uni/${uni.key}`} key={uni.key} onClick={onClose}>{uni.label}</Link>
        ))}
      </div>
      */}

      <span className="mnav-group-label">Моё обучение</span>
      <div className="msub">
        <Link to="/my-learning" onClick={onClose}>Мой прогресс</Link>
        <Link to="/my-learning/essays" onClick={onClose}>Мои сочинения</Link>
        <Link to="/dictionary" onClick={onClose}>Словарь</Link>
      </div>

      {/* "О проекте" temporarily hidden per product decision.
      <Link className="mtop-link" to="/about" onClick={onClose}>О проекте</Link>
      */}

      {authOpen && <AuthModal onClose={() => setAuthOpen(false)} />}
    </div>
  )
}
