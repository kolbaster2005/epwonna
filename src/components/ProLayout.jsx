import { useState } from 'react'
import { Link } from 'react-router-dom'
import ProSidebar from './ProSidebar.jsx'
import UserMenu from './UserMenu.jsx'
import { IconSettings } from './Icons.jsx'
import { usePersonalization } from '../contexts/PersonalizationContext.jsx'
import Footer from './Footer.jsx'
import logo from '../assets/logo.png'

const COLLAPSED_KEY = 'pro-sidebar-collapsed'

function readCollapsed() {
  try {
    return localStorage.getItem(COLLAPSED_KEY) === '1'
  } catch {
    return false
  }
}

// Раскладка сайта для pro-пользователей (см. App.jsx): вместо шапки —
// левое меню (ProSidebar), которое на широких экранах сворачивается до
// полоски с иконками (кнопка внутри самого меню, состояние помнится в
// localStorage), а на узких выезжает по бургеру поверх страницы. Сверху —
// тонкая панель с аккаунтом (и бургером на узких экранах); её высота
// совпадает с обычной шапкой (76px), так что sticky-блоки страниц с
// `top: 96px` остаются на своих местах.
export default function ProLayout({ children, drawerOpen, onDrawerOpen, onDrawerClose }) {
  const [collapsed, setCollapsed] = useState(readCollapsed)
  const { footerTheme } = usePersonalization()

  function toggleCollapsed() {
    setCollapsed((prev) => {
      const next = !prev
      try {
        localStorage.setItem(COLLAPSED_KEY, next ? '1' : '0')
      } catch {
        // без localStorage просто не запомним — не страшно
      }
      return next
    })
  }

  return (
    <div className={'pro-layout' + (collapsed ? ' pro-layout--collapsed' : '')}>
      <ProSidebar collapsed={collapsed} onToggleCollapsed={toggleCollapsed} drawerOpen={drawerOpen} onDrawerClose={onDrawerClose} />
      {drawerOpen && <div className="pro-drawer-backdrop" onClick={onDrawerClose} />}

      <div className="pro-layout-body">
        <header className="pro-topbar">
          <button type="button" className="pro-topbar-toggle" onClick={onDrawerOpen} aria-label="Меню">
            <MenuToggleIcon />
          </button>
          <Link to="/" className="logo pro-topbar-logo">
            <div className="logo-mark">
              <img src={logo} alt="" />
            </div>
            <div className="logo-text">
              <b>EP <span>WONNA</span></b>
            </div>
          </Link>

          <div className="pro-topbar-user">
            <Link to="/personalization" className="pro-topbar-settings" aria-label="Персонализация" title="Персонализация">
              <IconSettings size={20} />
            </Link>
            <UserMenu withDetails />
          </div>
        </header>

        {children}
        <Footer className={`site-footer--${footerTheme}`} />
      </div>
    </div>
  )
}

function MenuToggleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <path d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  )
}
