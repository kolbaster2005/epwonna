import { IconStar } from './Icons.jsx'
import ModalOverlay from './ModalOverlay.jsx'

function formatExpiry(date) {
  return date.toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
}

// Показывается один раз сразу после успешной активации пробного PRO
// (см. activateProTrial в AuthContext.jsx и кнопку "Попробовать
// бесплатно" в Pricing.jsx).
export default function ProTrialModal({ until, onClose }) {
  return (
    <ModalOverlay onClose={onClose}>
      <div className="modal upsell-modal">
        <button type="button" className="modal-close" onClick={onClose} aria-label="Закрыть">✕</button>
        <span className="upsell-modal-badge">
          <IconStar size={13} /> PRO
        </span>
        <h3>Поздравляем! 🎉</h3>
        <p className="upsell-modal-reason">
          На ближайшие 24 часа у вас активирован PRO — безлимитные ИИ-проверки сочинений и грамматических заданий,
          транскрипция аудирования.
        </p>
        {until && <p className="upsell-modal-pitch">Действует до {formatExpiry(until)}.</p>}
        <div className="upsell-modal-actions">
          <button type="button" className="btn btn-primary upsell-modal-cta" onClick={onClose}>
            Отлично, начать
          </button>
        </div>
      </div>
    </ModalOverlay>
  )
}
