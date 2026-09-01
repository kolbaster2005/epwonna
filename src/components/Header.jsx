import { useEffect, useRef, useState } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { examList } from '../data/examData.js'
import { universities } from '../data/universities.js'
import { avatarOptions, avatarSrcById } from '../data/avatars.js'
import { useAuth } from '../contexts/AuthContext.jsx'
import { IconNoAvatar } from './Icons.jsx'
import AuthModal from './AuthModal.jsx'
import logo from '../assets/logo.png'

// "Моё обучение" is a dropdown now, same pattern as EP-экзамены/Вступительные
// в вузы — Мои сочинения and Словарь used to be separate top-level things
// (a widget on the same page, and its own nav item, respectively); now
// they're all sub-pages of one section.
const MY_LEARNING_ITEMS = [
  { to: '/my-learning', label: 'Мой прогресс', desc: 'Результаты по предметам' },
  { to: '/my-learning/essays', label: 'Мои сочинения', desc: 'Сохранённые письменные работы' },
  { to: '/dictionary', label: 'Словарь', desc: 'Слова и выражения для подготовки' },
]

export default function Header({ onBurgerClick }) {
  const { user, profile, isAdmin, signOut, updateAvatar } = useAuth()
  const [authOpen, setAuthOpen] = useState(false)
  // Which dropdown is open — 'exams' | 'unis' | 'user' | null. Click-driven,
  // not hover: hover made it nearly impossible to actually reach the
  // submenu (the dropdown would close the instant the cursor left the
  // trigger). Click to open, click the trigger again / click anywhere
  // outside / press Escape to close.
  const [openMenu, setOpenMenu] = useState(null)
  const examsRef = useRef(null)
  const unisRef = useRef(null)
  const learningRef = useRef(null)
  const userRef = useRef(null)
  const menuRefs = { exams: examsRef, unis: unisRef, learning: learningRef, user: userRef }

  useEffect(() => {
    if (!openMenu) return undefined

    function handlePointerDown(e) {
      const ref = menuRefs[openMenu]
      if (ref?.current && !ref.current.contains(e.target)) {
        setOpenMenu(null)
      }
    }
    function handleKeyDown(e) {
      if (e.key === 'Escape') setOpenMenu(null)
    }

    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openMenu])

  function toggleMenu(name) {
    setOpenMenu((cur) => (cur === name ? null : name))
  }

  // Falls back to the first letter of the email until a photo is picked
  // (or if 'avatar_key' is null, i.e. the person explicitly chose "no
  // photo" from the picker).
  const avatarLetter = user?.email?.[0]?.toUpperCase() || '?'
  const avatarSrc = profile?.avatar_key ? avatarSrcById(profile.avatar_key) : null

  async function handlePickAvatar(avatarKey) {
    try {
      await updateAvatar(avatarKey)
    } catch (err) {
      window.alert(err.message || 'Не удалось сохранить аватар.')
    }
  }

  return (
    <header className="main-wrapper site-header">
      <div className="header-inner">
        <Link to="/" className="logo">
          <div className="logo-mark">
            <img src={logo} alt="" />
          </div>
          <div className="logo-text">
            <b>EP <span>WONNA</span></b>
          </div>
        </Link>

        <nav className="main-nav">
          <NavLink to="/" end className={({ isActive }) => 'nav-link' + (isActive ? ' active' : '')}>
            Главная
          </NavLink>

          {/* Group items — no page of their own (see App.jsx), just a
              click-to-open dropdown listing the pages that already exist. */}
          <div className="nav-item" ref={examsRef}>
            <button
              type="button"
              className="nav-link"
              aria-expanded={openMenu === 'exams'}
              aria-haspopup="true"
              onClick={() => toggleMenu('exams')}
            >
              EP – экзамены <i className={'chev' + (openMenu === 'exams' ? ' open' : '')} />
            </button>
            <div className={'dropdown' + (openMenu === 'exams' ? ' open' : '')}>
              {examList.map((exam) => (
                <Link to={`/${exam.key}`} key={exam.key} onClick={() => setOpenMenu(null)}>
                  {exam.label} <span>{exam.homeTitle}</span>
                </Link>
              ))}
            </div>
          </div>

          <div className="nav-item" ref={unisRef}>
            <button
              type="button"
              className="nav-link"
              aria-expanded={openMenu === 'unis'}
              aria-haspopup="true"
              onClick={() => toggleMenu('unis')}
            >
              Вступительные в вузы <i className={'chev' + (openMenu === 'unis' ? ' open' : '')} />
            </button>
            <div className={'dropdown' + (openMenu === 'unis' ? ' open' : '')}>
              {universities.map((uni) => (
                <Link to={`/uni/${uni.key}`} key={uni.key} onClick={() => setOpenMenu(null)}>
                  {uni.label} <span>{uni.shortDesc}</span>
                </Link>
              ))}
            </div>
          </div>

          <div className="nav-item" ref={learningRef}>
            <button
              type="button"
              className="nav-link"
              aria-expanded={openMenu === 'learning'}
              aria-haspopup="true"
              onClick={() => toggleMenu('learning')}
            >
              Моё обучение <i className={'chev' + (openMenu === 'learning' ? ' open' : '')} />
            </button>
            <div className={'dropdown' + (openMenu === 'learning' ? ' open' : '')}>
              {MY_LEARNING_ITEMS.map((item) => (
                <Link to={item.to} key={item.to} onClick={() => setOpenMenu(null)}>
                  {item.label} <span>{item.desc}</span>
                </Link>
              ))}
            </div>
          </div>
          <NavLink to="/about" className={({ isActive }) => 'nav-link' + (isActive ? ' active' : '')}>
            О проекте
          </NavLink>
        </nav>

        <div className="header-actions">
          {user ? (
            <div className="nav-item" ref={userRef}>
              <button
                type="button"
                className="user-avatar"
                aria-expanded={openMenu === 'user'}
                aria-haspopup="true"
                onClick={() => toggleMenu('user')}
                aria-label="Аккаунт"
              >
                {avatarSrc ? <img src={avatarSrc} alt="" /> : avatarLetter}
              </button>
              <div className={'dropdown user-dropdown' + (openMenu === 'user' ? ' open' : '')}>
                <div className="user-dropdown-email" title={user.email}>{user.email}</div>

                <div className="avatar-picker">
                  <button
                    type="button"
                    className={'avatar-picker-item avatar-picker-none' + (!profile?.avatar_key ? ' active' : '')}
                    onClick={() => handlePickAvatar(null)}
                    aria-label="Без фото"
                    title="Без фото"
                  >
                    <IconNoAvatar size={18} />
                  </button>
                  {avatarOptions.map((a) => (
                    <button
                      type="button"
                      key={a.id}
                      className={'avatar-picker-item' + (profile?.avatar_key === a.id ? ' active' : '')}
                      onClick={() => handlePickAvatar(a.id)}
                      aria-label="Выбрать аватар"
                    >
                      <img src={a.src} alt="" />
                    </button>
                  ))}
                </div>

                {isAdmin && (
                  <Link to="/admin" onClick={() => setOpenMenu(null)}>
                    Админка <span>Управление пробниками и вопросами</span>
                  </Link>
                )}
                <button type="button" className="user-dropdown-signout" onClick={signOut}>
                  Выйти
                </button>
              </div>
            </div>
          ) : (
            <button className="btn btn-outline" onClick={() => setAuthOpen(true)}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M12 12c2.7 0 4.9-2.2 4.9-4.9S14.7 2.2 12 2.2 7.1 4.4 7.1 7.1 9.3 12 12 12Zm0 2.5c-3.6 0-8 1.6-8 4.4V21h16v-2.1c0-2.8-4.4-4.4-8-4.4Z" fill="currentColor" />
              </svg>
              Войти
            </button>
          )}
          <button className="burger" onClick={onBurgerClick} aria-label="Меню">
            <span />
          </button>
        </div>
      </div>

      {authOpen && <AuthModal onClose={() => setAuthOpen(false)} />}
    </header>
  )
}
