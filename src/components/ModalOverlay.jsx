import { useEffect } from 'react'
import { createPortal } from 'react-dom'

// Общая обёртка для всех модалок (.modal-overlay + .modal — сам .modal
// с содержимым приходит через children). Делает две вещи, которые
// раньше были только у AuthModal и которые нужны вообще всем:
//
// 1. Рендерит оверлей через портал прямо в <body>, а не в месте
//    использования в дереве компонентов. Модалки открываются из
//    TestPage.jsx и т. п., которые лежат внутри .pro-shell —
//    а у .pro-shell есть contain: layout (см. _pro-layout.scss), что
//    создаёт новый containing block для position: fixed-потомков. Без
//    портала оверлей позиционировался бы относительно .pro-shell, а не
//    всего экрана — перекрывал бы только белую карточку с контентом, не
//    закрывая собой левое меню. Та же причина, по которой раньше модалку
//    было нужно уводить порталом из-под .site-header (у него
//    backdrop-filter — другое свойство, тот же самый эффект).
// 2. Блокирует скролл страницы, пока модалка открыта — сам .modal при
//    необходимости прокручивается независимо (см. max-height в
//    _modal.scss), а фон за оверлеем — нет.
export default function ModalOverlay({ children, onClose, className = '' }) {
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    document.body.classList.add('modal-open')
    return () => {
      document.body.style.overflow = ''
      document.body.classList.remove('modal-open')
    }
  }, [])

  return createPortal(
    <div className={('modal-overlay ' + className).trim()} onClick={(e) => e.target === e.currentTarget && onClose()}>
      {children}
    </div>,
    document.body
  )
}
