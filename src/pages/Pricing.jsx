import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext.jsx'
import { useDialog } from '../contexts/DialogContext.jsx'
import { IconCheckCircle, IconLock, IconStar } from '../components/Icons.jsx'
import AuthModal from '../components/AuthModal.jsx'
import ProTrialModal from '../components/ProTrialModal.jsx'

// Реальные отличия PRO от бесплатного тарифа на сегодня — ровно те, что
// уже проверяются в коде (см. isPro в AuthContext.jsx и места, где он
// используется: check-essay/index.ts, check-qa-table/index.ts,
// TestPage.jsx handleOpenTranscript). Намеренно НЕ включены сюда:
// "Тренировка" (PracticeBuilder — сейчас внутренний инструмент только
// для админа, не часть PRO) и доступ к пробникам "только для
// авторизованных" (это про вход в аккаунт вообще, не про PRO —
// доступно любому залогиненному, см. requires_auth в testsService.js).
const FEATURES = [
  { label: 'Все пробники после входа в аккаунт', basic: true, pro: true },
  { label: 'Теория, полезные материалы, словарь', basic: true, pro: true },
  { label: 'Личный кабинет с прогрессом по предметам', basic: true, pro: true },
  { label: 'ИИ-проверка сочинений', basic: '1 проверка в день', pro: 'Без ограничений' },
  { label: 'ИИ-проверка грамматических заданий', basic: '3 проверки в день', pro: 'Без ограничений' },
  { label: 'Транскрипция аудирования (Hörverstehen)', basic: false, pro: true },
]

function FeatureCell({ value }) {
  if (value === true) return <IconCheckCircle size={19} className="pricing-icon-yes" />
  if (value === false) return <IconLock size={16} className="pricing-icon-no" />
  return <span className="pricing-cell-text">{value}</span>
}

export default function Pricing() {
  const { user, isPro, trialUsed, trialActive, activateProTrial } = useAuth()
  const { alertMessage } = useDialog()
  const [authOpen, setAuthOpen] = useState(false)
  const [activating, setActivating] = useState(false)
  const [trialResult, setTrialResult] = useState(null) // Date|null — модалка-поздравление открыта, если не null

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

  return (
    <div className="pricing-page">
      <div className="pricing-head">
        <h1>Базовый и PRO</h1>
        <p>Платформа бесплатна для всех — PRO снимает дневные лимиты на ИИ-проверки и открывает транскрипцию аудирования.</p>
      </div>

      <div className="pricing-cards">
        <div className="pricing-card">
          <div className="pricing-card-head">
            <h2>Базовый</h2>
            <div className="pricing-card-price">Бесплатно</div>
          </div>
          {!user ? (
            <button type="button" className="btn btn-outline" onClick={() => setAuthOpen(true)}>
              Зарегистрироваться
            </button>
          ) : (
            !isPro && <div className="pricing-card-current">Ваш текущий тариф</div>
          )}
        </div>

        <div className="pricing-card pricing-card-pro">
          <span className="pricing-card-badge">
            <IconStar size={13} /> PRO
          </span>
          <div className="pricing-card-head">
            <h2>PRO</h2>
            <div className="pricing-card-price">
              10 € <span>/ месяц</span>
            </div>
          </div>
          {isPro ? (
            <div className="pricing-card-current">
              Ваш текущий тариф{trialActive && ' (пробный)'}
            </div>
          ) : (
            <div className="pricing-card-actions">
              {!trialUsed && (
                <button type="button" className="btn btn-primary" onClick={handleTryFree} disabled={activating}>
                  {activating ? 'Активируем…' : 'Попробовать бесплатно'}
                </button>
              )}
              <a
                href="https://t.me/wuw0nna"
                target="_blank"
                rel="noreferrer"
                className={'btn' + (trialUsed ? ' btn-primary' : ' btn-outline')}
              >
                Купить
              </a>
            </div>
          )}
        </div>
      </div>

      {!isPro && !trialUsed && <p className="pricing-trial-note">24 часа PRO бесплатно — один раз на аккаунт.</p>}

      <div className="pricing-table">
        <div className="pricing-row pricing-row-head">
          <span />
          <span>Базовый</span>
          <span>PRO</span>
        </div>
        {FEATURES.map((f) => (
          <div className="pricing-row" key={f.label}>
            <span className="pricing-feature-label">{f.label}</span>
            <span className="pricing-cell">
              <FeatureCell value={f.basic} />
            </span>
            <span className="pricing-cell pricing-cell-pro">
              <FeatureCell value={f.pro} />
            </span>
          </div>
        ))}
      </div>

      <p className="pricing-note">
        Автоматическая оплата пока не подключена — кнопка «Купить» ведёт в Telegram, там же оформляем подписку
        вручную.
      </p>

      {authOpen && <AuthModal onClose={() => setAuthOpen(false)} />}
      {trialResult && <ProTrialModal until={trialResult} onClose={() => setTrialResult(null)} />}
    </div>
  )
}
