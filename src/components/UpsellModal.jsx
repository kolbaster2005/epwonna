import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext.jsx'
import { useDialog } from '../contexts/DialogContext.jsx'
import { IconStar } from './Icons.jsx'
import ModalOverlay from './ModalOverlay.jsx'
import AuthModal from './AuthModal.jsx'
import ProTrialModal from './ProTrialModal.jsx'

// Общая "продающая" модалка — открывается в любом месте, где упёрлись в
// границу бесплатного тарифа (дневной лимит ИИ-проверок, попытка
// открыть транскрипцию аудирования и т. д.). `reason` — конкретная
// причина показа в данном случае, остальное (питч, цена, кнопки) одно
// и то же везде, см. TestPage.jsx.
//
// Пока пробный период не использован — две кнопки (акцентная "Попробовать
// бесплатно" активирует его прямо отсюда, см. activateProTrial в
// AuthContext.jsx; менее акцентная — на страницу сравнения тарифов).
// Если пробный период уже использован, остаётся только кнопка сравнения.
export default function UpsellModal({ reason, onClose }) {
  const { user, trialUsed, activateProTrial } = useAuth()
  const { alertMessage } = useDialog()
  const [authOpen, setAuthOpen] = useState(false)
  const [activating, setActivating] = useState(false)
  const [trialResult, setTrialResult] = useState(null) // Date|null — пробный период только что активирован

  async function handleTryFree() {
    if (!user) {
      setAuthOpen(true)
      return
    }
    setActivating(true)
    try {
      const until = await activateProTrial()
      setTrialResult(until ? new Date(until) : new Date(Date.now() + 24 * 60 * 60 * 1000))
    } catch (err) {
      await alertMessage(err.message || 'Не удалось активировать пробный период. Попробуйте ещё раз.')
    } finally {
      setActivating(false)
    }
  }

  if (trialResult) {
    return <ProTrialModal until={trialResult} onClose={onClose} />
  }

  return (
    <ModalOverlay onClose={onClose}>
      <div className="modal upsell-modal">
        <button type="button" className="modal-close" onClick={onClose} aria-label="Закрыть">✕</button>
        <span className="upsell-modal-badge">
          <IconStar size={13} /> PRO
        </span>
        <h3>Это доступно в PRO</h3>
        {reason && <p className="upsell-modal-reason">{reason}</p>}
        <p className="upsell-modal-pitch">
          Безлимитные ИИ-проверки сочинений и грамматических заданий, транскрипция аудирования — и это только начало.
        </p>
        <div className="upsell-modal-price">
          <span className="upsell-modal-price-new">10 €</span>
          <span className="upsell-modal-price-period">/ месяц</span>
        </div>
        <div className="upsell-modal-actions">
          {!trialUsed && (
            <button type="button" className="btn btn-primary upsell-modal-cta" onClick={handleTryFree} disabled={activating}>
              {activating ? 'Активируем…' : 'Попробовать бесплатно'}
            </button>
          )}
          <Link
            to="/pro"
            className={'btn upsell-modal-cta' + (trialUsed ? ' btn-primary' : ' btn-outline')}
            onClick={onClose}
          >
            Сравнить тарифы
          </Link>
        </div>
      </div>
      {authOpen && <AuthModal onClose={() => setAuthOpen(false)} />}
    </ModalOverlay>
  )
}
