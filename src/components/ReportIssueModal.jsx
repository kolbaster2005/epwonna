import { useState } from 'react'
import { submitQuestionReport } from '../services/reportsService.js'

export default function ReportIssueModal({ userId, email, taskId, taskNumber, onClose }) {
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit() {
    if (!message.trim()) {
      setError('Опишите, что не так.')
      return
    }
    setSubmitting(true)
    setError('')
    try {
      await submitQuestionReport({ userId, email, taskId, taskNumber, message: message.trim() })
      setSent(true)
    } catch (err) {
      setError(err.message || 'Не удалось отправить обращение. Попробуйте ещё раз.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal report-modal">
        <button type="button" className="modal-close" onClick={onClose} aria-label="Закрыть">✕</button>
        <h3>Нашли ошибку?</h3>

        {sent ? (
          <div className="report-modal-body">
            <p className="admin-note">Спасибо, обращение отправлено — мы посмотрим.</p>
            <button type="button" className="btn btn-primary" onClick={onClose}>Закрыть</button>
          </div>
        ) : (
          <div className="report-modal-body">
            <p className="admin-note">
              {taskNumber != null ? `По вопросу #${taskNumber}.` : 'По этому вопросу.'} Опишите, что показалось неверным
              или неудобным — мы проверим.
            </p>
            <textarea
              className="report-modal-textarea"
              rows={5}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Например: в задании нет правильного варианта ответа среди предложенных…"
              autoFocus
            />
            {error && <p className="word-modal-error">{error}</p>}
            <button type="button" className="btn btn-primary" onClick={handleSubmit} disabled={submitting}>
              {submitting ? 'Отправляю…' : 'Отправить'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
