import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { exams, examList } from '../data/examData.js'
import { useAuth } from '../contexts/AuthContext.jsx'
import { listAttempts, summarizeAttempts, getLatestDraftAttempt } from '../services/attemptsService.js'
import { listTests } from '../services/testsService.js'
import ExamIcon from '../components/ExamIcon.jsx'
import PageLoader from '../components/PageLoader.jsx'

// Личный кабинет для pro-пользователей — полностью заменяет собой
// обычную главную (см. Home.jsx: isPro рендерит этот компонент вместо
// себя). Пока два виджета — «Продолжим?» (последний незавершённый
// пробник) и «Прогресс по предметам» (сколько пробников пройдено по
// каждому предмету). Ещё виджеты будут добавляться сюда же по мере
// того, как их попросят.
export default function ProDashboard() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [resumeDraft, setResumeDraft] = useState(null)
  const [resumeTotal, setResumeTotal] = useState(0)
  const [subjectProgress, setSubjectProgress] = useState([])

  useEffect(() => {
    if (!user) {
      setLoading(false)
      return undefined
    }
    let cancelled = false
    setLoading(true)

    Promise.all([
      getLatestDraftAttempt(user.id),
      listAttempts(user.id),
      Promise.all(examList.map((e) => listTests(e.key))),
    ]).then(([draft, attemptsList, testsByExam]) => {
      if (cancelled) return

      setResumeDraft(draft)
      if (draft) {
        const examIndex = examList.findIndex((e) => e.key === draft.examKey)
        const matchingTest = examIndex >= 0 ? testsByExam[examIndex].find((t) => t.id === draft.testId) : null
        setResumeTotal(matchingTest?.questionCount ?? 0)
      }

      setSubjectProgress(
        examList.map((e, i) => {
          const totalTests = testsByExam[i].filter((t) => t.format !== 'oral' && !t.isModel && !t.isTaskBank && !t.isGenerated).length
          const examAttempts = attemptsList.filter((a) => a.examKey === e.key)
          return { examKey: e.key, ...summarizeAttempts(examAttempts, totalTests) }
        })
      )

      setLoading(false)
    })

    return () => {
      cancelled = true
    }
  }, [user])

  const answeredInDraft = resumeDraft ? Object.keys(resumeDraft.answersSnapshot?.answers || {}).length : 0
  const resumePercent = resumeTotal > 0 ? Math.round((answeredInDraft / resumeTotal) * 100) : 0

  if (loading) return <PageLoader />

  return (
    <div className="pro-dashboard">
      <h1 className="pro-dashboard-greeting">Привет, {user.email}!</h1>

      <div className="pro-dashboard-grid">
        {resumeDraft && (
          <section className="widget-card pro-resume-card">
            <h2>Продолжим?</h2>
            <Link className={`pro-resume-link ${exams[resumeDraft.examKey]?.className || ''}`} to={`/${resumeDraft.examKey}/test/${resumeDraft.testId}`}>
              <div className="pro-resume-link-icon" style={{ background: exams[resumeDraft.examKey]?.color }}>
                <ExamIcon examKey={resumeDraft.examKey} size={22} />
              </div>
              <div className="pro-resume-link-body">
                <span className="pro-resume-link-exam">{exams[resumeDraft.examKey]?.label}</span>
                <span className="pro-resume-link-title">{resumeDraft.testTitle}</span>
              </div>
            </Link>
            {resumeTotal > 0 && (
              <div className="pro-resume-progress">
                <div className="pro-resume-progress-track">
                  <div className="pro-resume-progress-fill" style={{ width: `${resumePercent}%` }} />
                </div>
                <span className="pro-resume-progress-label">
                  Отвечено {answeredInDraft} из {resumeTotal}
                </span>
              </div>
            )}
          </section>
        )}

        <section className="widget-card">
          <h2>Прогресс по предметам</h2>
          <div className="pro-subject-progress-list">
            {subjectProgress.map((p) => {
              const exam = exams[p.examKey]
              const percent = p.total > 0 ? Math.round((p.completed / p.total) * 100) : 0
              return (
                <Link className="pro-subject-progress-row" to={`/${p.examKey}`} key={p.examKey}>
                  <span className="pro-subject-progress-label">{exam?.label}</span>
                  <div className="pro-subject-progress-track">
                    <div className={`pro-subject-progress-fill ${exam?.className || ''}`} style={{ width: `${percent}%` }} />
                  </div>
                  <span className="pro-subject-progress-count">{p.completed} из {p.total}</span>
                </Link>
              )
            })}
          </div>
        </section>
      </div>
    </div>
  )
}
