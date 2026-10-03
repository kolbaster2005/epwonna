import { Link, NavLink } from 'react-router-dom'
import { visibleExamList } from '../data/examData.js'
import { useAuth } from '../contexts/AuthContext.jsx'
import { usePersonalization } from '../contexts/PersonalizationContext.jsx'
import { IconHome, IconBarChart, IconEdit, IconBook, IconShield, IconSettings } from './Icons.jsx'
import ExamIcon from './ExamIcon.jsx'
import logo from '../assets/logo.png'

// Разделы «Моё обучение» — те же, что в дропдауне шапки (Header.jsx),
// только плоским списком с иконками.
const LEARNING_ITEMS = [
  { to: '/my-learning', label: 'Мой прогресс', icon: IconBarChart, end: true },
  { to: '/my-learning/essays', label: 'Мои сочинения', icon: IconEdit },
  { to: '/dictionary', label: 'Словарь', icon: IconBook },
]

// Совпадает с $bp-lg: от этой ширины меню всегда на экране и логотип
// закрепляет/сворачивает его, ниже — меню-шторка и логотип ведёт на главную.
const DESKTOP_QUERY = '(min-width: 960px)'

function navClass({ isActive }) {
  return 'pro-sidebar-link' + (isActive ? ' active' : '')
}

// Левое меню pro-раскладки (ProLayout.jsx) — заменяет собой шапку сайта.
// `collapsed` — свёрнуто до иконок (только на широких экранах). Клик по
// логотипу разворачивает / сворачивает меню; клик по пустому месту
// свёрнутого меню (не по пунктам) тоже его разворачивает.
// `drawerOpen` — на узких экранах меню выезжает поверх страницы.
export default function ProSidebar({ collapsed, onToggleCollapsed, drawerOpen, onDrawerClose }) {
  const { isAdmin } = useAuth()
  const { filterShownExams } = usePersonalization()
  function handleLogoClick(e) {
    if (window.matchMedia(DESKTOP_QUERY).matches) {
      e.preventDefault()
      onToggleCollapsed()
    } else {
      onDrawerClose()
    }
  }

  // Клик по свёрнутому меню мимо пунктов (ссылок/кнопок) — разворачиваем.
  function handleSidebarClick(e) {
    if (collapsed && !e.target.closest('a, button') && window.matchMedia(DESKTOP_QUERY).matches) {
      onToggleCollapsed()
    }
  }

  function item(to, label, iconNode, end) {
    return (
      <NavLink to={to} end={end} className={navClass} key={to} title={collapsed ? label : undefined} onClick={onDrawerClose}>
        {iconNode}
        <span className="pro-sidebar-label">{label}</span>
      </NavLink>
    )
  }

  return (
    <aside
      className={'pro-sidebar' + (collapsed ? ' collapsed' : '') + (drawerOpen ? ' drawer-open' : '')}
      onClick={handleSidebarClick}
    >
      <div className="pro-sidebar-top">
        <Link
          to="/"
          className="logo pro-sidebar-logo"
          onClick={handleLogoClick}
          title={collapsed ? 'Закрепить меню открытым' : 'Свернуть меню'}
        >
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

        {/* Шестерёнка слева от «Предметы» — переход в «Персонализацию»,
            где выбирается, какие курсы здесь показывать. */}
        <div className="pro-sidebar-heading pro-sidebar-heading--with-action">
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
        </div>
        {filterShownExams(visibleExamList(isAdmin)).map((exam) =>
          item(
            `/${exam.key}`,
            exam.label,
            <span className="pro-sidebar-exam-icon" style={{ background: exam.color }}>
              <ExamIcon examKey={exam.key} size={13} />
            </span>
          )
        )}

        <span className="pro-sidebar-heading">Моё обучение</span>
        {LEARNING_ITEMS.map(({ to, label, icon: Icon, end }) => item(to, label, <Icon size={20} />, end))}

        <span className="pro-sidebar-heading">Управление</span>
        {item('/personalization', 'Персонализация', <IconSettings size={20} />)}
        {isAdmin && item('/admin', 'Админка', <IconShield size={20} />)}
      </nav>
    </aside>
  )
}
