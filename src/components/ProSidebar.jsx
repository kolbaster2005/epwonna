import { useState } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { visibleExamList } from '../data/examData.js'
import { useAuth } from '../contexts/AuthContext.jsx'
import { usePersonalization } from '../contexts/PersonalizationContext.jsx'
import { IconHome, IconBarChart, IconEdit, IconBook, IconShield, IconSettings, IconLogout, IconLogin, IconStar } from './Icons.jsx'
import ExamIcon from './ExamIcon.jsx'
import AuthModal from './AuthModal.jsx'
import logo from '../assets/logo.png'

// Разделы «Моё обучение» — те же, что в дропдауне шапки (Header.jsx),
// только плоским списком с иконками.
const LEARNING_ITEMS = [
  { to: '/my-learning', label: 'Мой прогресс', icon: IconBarChart, end: true },
  { to: '/my-learning/essays', label: 'Мои сочинения', icon: IconEdit },
  { to: '/dictionary', label: 'Словарь', icon: IconBook },
]

function navClass({ isActive }) {
  return 'pro-sidebar-link' + (isActive ? ' active' : '')
}

// Левое меню pro-раскладки (ProLayout.jsx) — заменяет собой шапку сайта.
// От $bp-lg — узкая полоска только из иконок (как на референсе, без
// подписей, просто tooltip по title), всегда одной ширины, без
// сворачивания/разворачивания. На узких экранах — полноценная шторка
// с подписями и заголовками групп (там есть куда их девать).
export default function ProSidebar({ drawerOpen, onDrawerClose }) {
  const { user, isAdmin, signOut } = useAuth()
  const { filterShownExams } = usePersonalization()
  const [authOpen, setAuthOpen] = useState(false)

  function item(to, label, iconNode, end) {
    return (
      <NavLink to={to} end={end} className={navClass} key={to} title={label} onClick={onDrawerClose}>
        {iconNode}
        <span className="pro-sidebar-label">{label}</span>
      </NavLink>
    )
  }

  // Рендерится дважды ниже — под «Главная» для узкой иконки-полоски на
  // ноуте (от $bp-lg), и отдельно внизу меню для мобильной шторки (там
  // не из чего собирать "под Главная" — список пунктов там длиннее и
  // идёт с заголовками групп). className переключает, какая из двух
  // копий видна на каком экране — см. _pro-layout.scss.
  function authButton(className) {
    return user ? (
      <button type="button" className={'pro-sidebar-link pro-sidebar-logout ' + className} onClick={signOut} title="Выйти">
        <IconLogout size={20} />
        <span className="pro-sidebar-label">Выйти</span>
      </button>
    ) : (
      <button type="button" className={'pro-sidebar-link pro-sidebar-logout ' + className} onClick={() => setAuthOpen(true)} title="Войти">
        <IconLogin size={20} />
        <span className="pro-sidebar-label">Войти</span>
      </button>
    )
  }

  return (
    <aside className={'pro-sidebar' + (drawerOpen ? ' drawer-open' : '')}>
      <div className="pro-sidebar-top">
        <Link to="/" className="logo pro-sidebar-logo" onClick={onDrawerClose}>
          <div className="logo-mark">
            <img src={logo} alt="" />
          </div>
          <div className="logo-text">
            <b>EP <span>WONNA</span></b>
          </div>
        </Link>
        <button type="button" className="pro-sidebar-close" onClick={onDrawerClose} aria-label="Закрыть меню">
          ✕
        </button>
      </div>

      <nav className="pro-sidebar-nav">
        {item('/', 'Главная', <IconHome size={20} />, true)}
        {authButton('pro-sidebar-authbtn-lg')}

        <div className="pro-sidebar-divider" />
        <span className="pro-sidebar-heading pro-sidebar-heading--with-action">
          <Link
            to="/personalization"
            className="pro-sidebar-heading-action"
            onClick={onDrawerClose}
            aria-label="Персонализация: выбрать курсы"
            title="Выбрать курсы"
          >
            <IconSettings size={15} />
          </Link>
          <span>Предметы</span>
        </span>
        {filterShownExams(visibleExamList()).map((exam) =>
          item(
            `/${exam.key}`,
            exam.label,
            <span className="pro-sidebar-exam-icon" style={{ background: exam.color }}>
              <ExamIcon examKey={exam.key} size={13} />
            </span>
          )
        )}

        <div className="pro-sidebar-divider" />
        <span className="pro-sidebar-heading">Моё обучение</span>
        {LEARNING_ITEMS.map(({ to, label, icon: Icon, end }) => item(to, label, <Icon size={20} />, end))}

        <div className="pro-sidebar-divider" />
        <span className="pro-sidebar-heading">Управление</span>
        {item('/personalization', 'Персонализация', <IconSettings size={20} />)}
        {item('/pro', 'PRO', <IconStar size={20} />)}
        {isAdmin && item('/admin', 'Админка', <IconShield size={20} />)}
      </nav>

      {/* Выход (или вход для гостя) — внизу меню, как на референсе.
          Только мобильная шторка — на ноуте эта же кнопка уже показана
          выше, сразу под «Главная» (см. pro-sidebar-authbtn-lg). */}
      {authButton('pro-sidebar-authbtn-mobile')}

      {authOpen && <AuthModal onClose={() => setAuthOpen(false)} />}
    </aside>
  )
}
