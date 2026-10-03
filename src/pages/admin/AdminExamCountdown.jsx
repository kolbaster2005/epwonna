import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getExamCountdown, saveExamCountdown, daysUntil } from '../../services/examCountdownService.js'
import { useDialog } from '../../contexts/DialogContext.jsx'
import { pluralizeRu } from '../../utils/pluralize.js'
import PageLoader from '../../components/PageLoader.jsx'

// Настройки виджета «До экзаменов» на pro-главной: дата ближайшего
// экзамена и открыта ли регистрация. Количество дней виджет считает сам.
export default function AdminExamCountdown() {
  const { alertMessage } = useDialog()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [examDate, setExamDate] = useState('')
  const [registrationOpen, setRegistrationOpen] = useState(false)

  useEffect(() => {
    getExamCountdown().then((data) => {
      if (data) {
        setExamDate(data.examDate || '')
        setRegistrationOpen(data.registrationOpen)
      }
      setLoading(false)
    })
  }, [])

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    setSaved(false)
    try {
      await saveExamCountdown({ examDate, registrationOpen })
      setSaved(true)
    } catch (err) {
      await alertMessage(err.message || 'Не удалось сохранить.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <PageLoader />

  const days = examDate ? daysUntil(examDate) : null
  let preview
  if (days === null) preview = 'Дата не указана — виджет не показывается.'
  else if (days < 0) preview = 'Дата уже прошла — виджет не показывается.'
  else if (days === 0) preview = 'Экзамен сегодня.'
  else preview = `Сейчас виджет покажет: ${days} ${pluralizeRu(days, ['день', 'дня', 'дней'])}.`

  return (
    <div className="admin-page">
      <div className="admin-header">
        <div>
          <Link className="admin-back" to="/admin">← Админка</Link>
          <h1>До экзаменов</h1>
          <p>Дата и статус регистрации для виджета на главной. Дни до экзамена считаются автоматически.</p>
        </div>
      </div>

      <form className="admin-form admin-countdown-form" onSubmit={handleSubmit}>
        <div className="admin-fieldset">
          <label className="admin-field">
            <span>Дата экзамена</span>
            <input
              type="date"
              value={examDate}
              onChange={(e) => {
                setExamDate(e.target.value)
                setSaved(false)
              }}
            />
          </label>

          <label className="admin-field">
            <span>Регистрация</span>
            <select
              value={registrationOpen ? 'open' : 'closed'}
              onChange={(e) => {
                setRegistrationOpen(e.target.value === 'open')
                setSaved(false)
              }}
            >
              <option value="closed">Регистрация ещё не открыта</option>
              <option value="open">Регистрация открыта</option>
            </select>
          </label>

          <p className="admin-note">{preview}</p>
        </div>

        <div className="admin-countdown-actions">
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? 'Сохраняем…' : 'Сохранить'}
          </button>
          {saved && <span className="admin-countdown-saved">Сохранено</span>}
        </div>
      </form>
    </div>
  )
}
