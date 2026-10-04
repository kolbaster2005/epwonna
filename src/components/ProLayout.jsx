import { Link } from 'react-router-dom'
import ProSidebar from './ProSidebar.jsx'
import Footer from './Footer.jsx'
import logo from '../assets/logo.png'

// Раскладка сайта для pro-пользователей (см. App.jsx): никакой верхней
// панели — как на референсе, вся страница серого «холста», внутри
// которого слева узкая иконочная полоска (ProSidebar, от $bp-lg — просто
// иконки, без подписей/карточки) и один белый «шелл» со всем
// содержимым страницы. Аккаунт (аватарка, роль, смена фото) теперь
// живёт в виджете профиля на самой pro-главной (см. ProDashboard.jsx),
// а не в отдельной шапке — она есть не на каждой странице, а шелл есть
// всегда, так что бургер на узких экранах выезжает прямо из него.
export default function ProLayout({ children, drawerOpen, onDrawerOpen, onDrawerClose }) {
  return (
    <>
      <div className="pro-layout">
        <ProSidebar drawerOpen={drawerOpen} onDrawerClose={onDrawerClose} />
        {drawerOpen && <div className="pro-drawer-backdrop" onClick={onDrawerClose} />}

        <main className="pro-shell">
          {/* Только на узких экранах — там меню спрятано и выезжает по
              бургеру; от $bp-lg сайдбар всегда на экране, эта строка не
              нужна и скрыта (см. _pro-layout.scss). */}
          <div className="pro-shell-mobile-bar">
            <button type="button" className="pro-shell-toggle" onClick={onDrawerOpen} aria-label="Меню">
              <MenuToggleIcon />
            </button>
            <Link to="/" className="logo">
              <div className="logo-mark">
                <img src={logo} alt="" />
              </div>
              <div className="logo-text">
                <b>EP <span>WONNA</span></b>
              </div>
            </Link>
          </div>

          {children}
        </main>
      </div>
      {/* Подвал — вне холста: во всю ширину, как у всех остальных
          страниц, а не зажат в карточку вместе с сайдбаром. Всегда
          графит — выбора темы в «Персонализации» больше нет. */}
      <Footer className="site-footer--graphite" />
    </>
  )
}

function MenuToggleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <path d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  )
}
