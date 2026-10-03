import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { avatarOptions, avatarSrcById } from '../data/avatars.js'
import { useAuth } from '../contexts/AuthContext.jsx'
import { useDialog } from '../contexts/DialogContext.jsx'
import { IconNoAvatar } from './Icons.jsx'

// Аватар + выпадающее меню аккаунта (выбор аватара, админка, выход).
// Используется в шапке сайта (Header.jsx) и в верхней панели pro-кабинета
// (ProDashboard.jsx). `withDetails` — рядом с аватаром ещё имя и роль,
// как в верхней панели кабинета. Рендерить только для залогиненного.
export default function UserMenu({ withDetails = false }) {
  const { user, profile, isAdmin, isPro, signOut, updateAvatar } = useAuth()
  const { alertMessage } = useDialog()
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  // Click-driven, not hover — see the comment on openMenu in Header.jsx.
  useEffect(() => {
    if (!open) return undefined

    function handlePointerDown(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    function handleKeyDown(e) {
      if (e.key === 'Escape') setOpen(false)
    }

    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [open])

  // Falls back to the first letter of the email until a photo is picked
  // (or if 'avatar_key' is null, i.e. the person explicitly chose "no
  // photo" from the picker).
  const avatarLetter = user?.email?.[0]?.toUpperCase() || '?'
  const avatarSrc = profile?.avatar_key ? avatarSrcById(profile.avatar_key) : null
  // Отдельного поля с именем в profiles нет — показываем часть email до @.
  const displayName = user?.email?.split('@')[0] || ''
  const roleLabel = isAdmin ? 'Администратор' : isPro ? 'PRO-аккаунт' : 'Студент'

  async function handlePickAvatar(avatarKey) {
    try {
      await updateAvatar(avatarKey)
    } catch (err) {
      await alertMessage(err.message || 'Не удалось сохранить аватар.')
    }
  }

  if (!user) return null

  return (
    <div className={'nav-item' + (withDetails ? ' user-menu-detailed' : '')} ref={ref}>
      <button
        type="button"
        className="user-menu-trigger"
        aria-expanded={open}
        aria-haspopup="true"
        onClick={() => setOpen((v) => !v)}
        aria-label="Аккаунт"
      >
        <span className="user-avatar-wrap">
          <span className="user-avatar">{avatarSrc ? <img src={avatarSrc} alt="" /> : avatarLetter}</span>
          {isPro && !withDetails && <span className="pro-badge user-avatar-pro-badge">PRO</span>}
        </span>
        {withDetails && (
          <>
            <span className="user-menu-details">
              <span className="user-menu-name" title={user.email}>{displayName}</span>
              <span className="user-menu-role">{roleLabel}</span>
            </span>
            <i className={'chev' + (open ? ' open' : '')} />
          </>
        )}
      </button>
      <div className={'dropdown user-dropdown' + (open ? ' open' : '')}>
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
          <Link to="/admin" onClick={() => setOpen(false)}>
            Админка <span>Управление пробниками и вопросами</span>
          </Link>
        )}
        <button type="button" className="user-dropdown-signout" onClick={signOut}>
          Выйти
        </button>
      </div>
    </div>
  )
}
