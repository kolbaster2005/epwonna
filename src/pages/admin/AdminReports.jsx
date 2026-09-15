import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { listQuestionReports, setReportStatus } from '../../services/reportsService.js'
import PageLoader from '../../components/PageLoader.jsx'

function formatDate(iso) {
  return new Date(iso).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export default function AdminReports() {
  const [reports, setReports] = useState([])
  const [loading, setLoading] = useState(true)

  function reload() {
    setLoading(true)
    listQuestionReports().then((list) => {
      setReports(list)
      setLoading(false)
    })
  }

  useEffect(reload, [])

  async function toggleStatus(report) {
    const next = report.status === 'new' ? 'resolved' : 'new'
    setReports((prev) => prev.map((r) => (r.id === report.id ? { ...r, status: next } : r)))
    await setReportStatus(report.id, next)
  }

  return (
    <div className="admin-page">
      <div className="admin-header">
        <div>
          <h1>Обращения по вопросам</h1>
          <p>«Нашли ошибку?» с любой страницы теста попадает сюда.</p>
        </div>
        <Link className="btn btn-outline" to="/admin">← В админку</Link>
      </div>

      {loading ? (
        <PageLoader />
      ) : reports.length === 0 ? (
        <p className="admin-note">Обращений пока нет.</p>
      ) : (
        <div className="admin-reports-list">
          {reports.map((r) => (
            <div className={`admin-report-row ${r.status}`} key={r.id}>
              <div className="admin-report-meta">
                <span className="admin-pill">{r.taskNumber != null ? `Вопрос #${r.taskNumber}` : 'Вопрос'}</span>
                <span className="admin-report-email">{r.email || 'без email'}</span>
                <span className="admin-report-date">{formatDate(r.createdAt)}</span>
              </div>
              <p className="admin-report-message">{r.message}</p>
              <div className="admin-report-actions">
                {r.taskId && <code className="admin-report-taskid">{r.taskId}</code>}
                <button type="button" className="btn btn-outline" onClick={() => toggleStatus(r)}>
                  {r.status === 'new' ? 'Отметить решённым' : 'Вернуть в новые'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
