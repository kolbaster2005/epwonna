import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { exams, visibleExamList } from '../data/examData.js'
import { useAuth } from '../contexts/AuthContext.jsx'
import { usePersonalization } from '../contexts/PersonalizationContext.jsx'
import { listAttempts, summarizeAttempts, getLatestDraftAttempt } from '../services/attemptsService.js'
import { listTests } from '../services/testsService.js'
import { getExamCountdown, daysUntil } from '../services/examCountdownService.js'
import ExamIcon from '../components/ExamIcon.jsx'
import PageLoader from '../components/PageLoader.jsx'
import { IconArrowRight, IconCalendar, IconChevronDown } from '../components/Icons.jsx'
import { pluralizeRu } from '../utils/pluralize.js'

// Кольцо общего прогресса: r=34 в viewBox 80×80, stroke-dasharray
// рисует заполненную часть дуги.
const RING_RADIUS = 34
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS

// Пробники, которые считаются в прогрессе: письменные, не модели, не
// банк заданий и не сгенерированные.
function isCountedTest(t) {
  return t.format !== 'oral' && !t.isModel && !t.isTaskBank && !t.isGenerated
}

// «Сегодня, 12:34» / «Вчера, 16:20» / «12 сент., 11:03».
function formatWhen(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  const time = d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
  const startOfToday = new Date()
  startOfToday.setHours(0, 0, 0, 0)
  const dayDiff = Math.round((startOfToday - new Date(d.getFullYear(), d.getMonth(), d.getDate())) / 86400000)
  if (dayDiff === 0) return `Сегодня, ${time}`
  if (dayDiff === 1) return `Вчера, ${time}`
  return `${d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}, ${time}`
}

// Личный кабинет для pro-пользователей — полностью заменяет собой
// обычную главную (см. Home.jsx). Рендерится внутри ProLayout (левое
// меню + верхняя панель — см. App.jsx) на всю ширину: баннер, «Мои
// предметы» и правая колонка («До экзаменов», «Общий прогресс»).
export default function ProDashboard() {
  const { user, isAdmin } = useAuth()
  const [loading, setLoading] = useState(true)
  const [draft, setDraft] = useState(null)
  const [draftTotal, setDraftTotal] = useState(0)
  const [attempts, setAttempts] = useState([])
  const [testsByExam, setTestsByExam] = useState({})
  const [countdown, setCountdown] = useState(null)
  const [overallExpanded, setOverallExpanded] = useState(false)

  const { filterShownExams } = usePersonalization()
  // Курсы, скрытые в «Персонализации», не показываются нигде на главной —
  // ни карточкой, ни в общем прогрессе.
  const examList = filterShownExams(visibleExamList(isAdmin))
  const examListKey = examList.map((e) => e.key).join(',')

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
      getExamCountdown(),
    ]).then(([latestDraft, attemptsList, testsLists, countdownData]) => {
      if (cancelled) return

      setCountdown(countdownData)

      const byExam = Object.fromEntries(examList.map((e, i) => [e.key, testsLists[i]]))
      setTestsByExam(byExam)
      setAttempts(attemptsList)
      // Черновик по скрытому от пользователя предмету не показываем.
      const visibleDraft = latestDraft && byExam[latestDraft.examKey] ? latestDraft : null
      setDraft(visibleDraft)
      if (visibleDraft) {
        const matchingTest = byExam[visibleDraft.examKey].find((t) => t.id === visibleDraft.testId)
        setDraftTotal(matchingTest?.questionCount ?? 0)
      }
      setLoading(false)
    })

    return () => {
      cancelled = true
    }
    // examList целиком описывается examListKey
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, examListKey])

  const courses = useMemo(
    () =>
      examList.map((exam) => {
        const tests = testsByExam[exam.key] || []
        const summary = summarizeAttempts(
          attempts.filter((a) => a.examKey === exam.key),
          tests.filter(isCountedTest).length
        )
        const percent = summary.total > 0 ? Math.min(100, Math.round((summary.completed / summary.total) * 100)) : 0
        const examDraft = draft?.examKey === exam.key ? draft : null
        return { exam, ...summary, percent, draft: examDraft }
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [testsByExam, attempts, draft, examListKey]
  )

  if (loading) return <PageLoader />

  const totalCompleted = courses.reduce((sum, c) => sum + c.completed, 0)
  const totalTests = courses.reduce((sum, c) => sum + c.total, 0)
  const overallPercent = totalTests > 0 ? Math.min(100, Math.round((totalCompleted / totalTests) * 100)) : 0

  // Дату экзамена задаёт админ (/admin/exam-countdown), дни считаем от
  // сегодняшнего дня — число само уменьшается каждый день. Нет даты или
  // она уже прошла — виджет не показываем.
  const daysLeft = countdown?.examDate ? daysUntil(countdown.examDate) : null
  const showCountdown = daysLeft !== null && daysLeft >= 0

  const answeredInDraft = draft ? Object.keys(draft.answersSnapshot?.answers || {}).length : 0

  const draftPercent = draftTotal > 0 ? Math.min(100, Math.round((answeredInDraft / draftTotal) * 100)) : 0

  // Предмет с наименьшим процентом, где ещё остались непройденные
  // пробники — используется только как запасная ссылка в «Продолжить
  // обучение», когда черновика нет.
  const weakest = courses
    .filter((c) => c.total > c.completed)
    .sort((a, b) => a.percent - b.percent)[0]
  const nextStepTo = weakest ? `/${weakest.exam.key}` : '/my-learning'

  return (
    <div className="pro-dashboard">
      <div className="pro-dashboard-main">
        {/* «Продолжить обучение» — последний начатый (незавершённый)
            пробник. Нет черновика — предлагаем начать новый. */}
        <section className="pro-hero">
          <div className="pro-hero-text">
            <span className="pro-hero-pill">Продолжить обучение</span>
            {draft ? (
              <>
                <div className="pro-hero-exam">
                  <span className="pro-hero-exam-icon" style={{ background: exams[draft.examKey]?.color }}>
                    <ExamIcon examKey={draft.examKey} size={16} />
                  </span>
                  {exams[draft.examKey]?.label}
                  {draft.updatedAt && <span className="pro-hero-when">· {formatWhen(draft.updatedAt)}</span>}
                </div>
                <h1 className="pro-hero-title">{draft.testTitle}</h1>
                {draftTotal > 0 && (
                  <div className="pro-hero-progress">
                    <div className="pro-hero-progress-track">
                      <div className="pro-hero-progress-fill" style={{ width: `${draftPercent}%` }} />
                    </div>
                    <span>
                      Отвечено {answeredInDraft} из {draftTotal} · {draftPercent}%
                    </span>
                  </div>
                )}
                <Link to={`/${draft.examKey}/test/${draft.testId}`} className="pro-hero-btn">
                  Продолжить пробник <IconArrowRight size={16} />
                </Link>
              </>
            ) : (
              <>
                <h1 className="pro-hero-title">Начните новый пробник</h1>
                <p className="pro-hero-desc">
                  Незавершённых пробников нет. Выберите курс и начните — прогресс сохранится автоматически, и сюда можно будет вернуться в любой момент.
                </p>
                <Link to={nextStepTo} className="pro-hero-btn">
                  {weakest ? `Перейти к ${weakest.exam.label}` : 'Открыть прогресс'} <IconArrowRight size={16} />
                </Link>
              </>
            )}
          </div>
          <HeroArt />
        </section>

        <section className="pro-courses" id="pro-courses">
          <div className="pro-section-head">
            <h2>Мои предметы</h2>
          </div>
          <div className="pro-courses-grid">
            {courses.map((c) => (
              <Link
                key={c.exam.key}
                className={`pro-course-card ${c.exam.className}`}
                to={c.draft ? `/${c.exam.key}/test/${c.draft.testId}` : `/${c.exam.key}`}
              >
                <div className="pro-course-card-top">
                  <span className="pro-course-icon" style={{ background: c.exam.color }}>
                    <ExamIcon examKey={c.exam.key} size={20} />
                  </span>
                  <span className="pro-course-arrow">
                    <IconArrowRight size={14} />
                  </span>
                </div>
                <span className="pro-course-label">{c.exam.label}</span>
                <span className="pro-course-sub">{c.draft ? c.draft.testTitle : c.exam.homeTitle}</span>
                <div className="pro-course-track">
                  <div className="pro-course-fill" style={{ width: `${c.percent}%` }} />
                </div>
                <span className="pro-course-percent">{c.percent}%</span>
                <span className="pro-course-count">
                  {c.completed} из {c.total} {pluralizeRu(c.total, ['пробника', 'пробников', 'пробников'])}
                </span>
              </Link>
            ))}
          </div>
        </section>
      </div>

      <aside className="pro-dashboard-side">
        {showCountdown && (
          <section className="pro-card pro-countdown">
            <h2>
              <span className="pro-card-icon">
                <IconCalendar size={18} />
              </span>
              До экзаменов
            </h2>
            <div className="pro-countdown-body">
              <span className="pro-countdown-days">{daysLeft}</span>
              <span className="pro-countdown-text">
                <b>
                  {daysLeft === 0
                    ? 'экзамены сегодня'
                    : `${pluralizeRu(daysLeft, ['день', 'дня', 'дней'])} ${pluralizeRu(daysLeft, ['остался', 'осталось', 'осталось'])}`}
                </b>
                <span className={'pro-countdown-status' + (countdown.registrationOpen ? ' open' : '')}>
                  {countdown.registrationOpen ? 'Регистрация открыта' : 'Регистрация ещё не открыта'}
                </span>
              </span>
            </div>
          </section>
        )}

        <section className="pro-card pro-overall">
          <div className="pro-overall-head">
            <h2>Общий прогресс</h2>
            <button
              type="button"
              className={'pro-overall-toggle' + (overallExpanded ? ' open' : '')}
              onClick={() => setOverallExpanded((v) => !v)}
              aria-expanded={overallExpanded}
              aria-label={overallExpanded ? 'Скрыть прогресс по предметам' : 'Показать прогресс по предметам'}
            >
              <IconChevronDown size={16} />
            </button>
          </div>
          <div className="pro-overall-body">
            <div className="pro-ring">
              <svg viewBox="0 0 80 80" aria-hidden="true">
                <circle className="pro-ring-track" cx="40" cy="40" r={RING_RADIUS} />
                <circle
                  className="pro-ring-fill"
                  cx="40"
                  cy="40"
                  r={RING_RADIUS}
                  strokeDasharray={RING_CIRCUMFERENCE}
                  strokeDashoffset={RING_CIRCUMFERENCE * (1 - overallPercent / 100)}
                />
              </svg>
              <span className="pro-ring-percent">{overallPercent}%</span>
            </div>
            <div className="pro-overall-info">
              <b>{totalCompleted} из {totalTests}</b>
              <span>{pluralizeRu(totalTests, ['пробника', 'пробников', 'пробников'])} пройдено</span>
              <div className="pro-overall-bar">
                <div className="pro-overall-bar-fill" style={{ width: `${overallPercent}%` }} />
              </div>
              <Link to="/my-learning" className="pro-overall-more">
                Подробнее <IconArrowRight size={14} />
              </Link>
            </div>
          </div>

          {overallExpanded && (
            <div className="pro-overall-breakdown">
              {courses.map((c) => (
                <Link
                  key={c.exam.key}
                  className="pro-overall-breakdown-row"
                  to={c.draft ? `/${c.exam.key}/test/${c.draft.testId}` : `/${c.exam.key}`}
                >
                  <span className="pro-overall-breakdown-label">{c.exam.label}</span>
                  <div className="pro-overall-breakdown-track">
                    <div className="pro-overall-breakdown-fill" style={{ width: `${c.percent}%`, background: c.exam.color }} />
                  </div>
                  <span className="pro-overall-breakdown-percent">{c.percent}%</span>
                </Link>
              ))}
            </div>
          )}
        </section>
      </aside>
    </div>
  )
}

// Иллюстрация баннера: ноутбук с чек-листом и зелёной галочкой на фоне
// мягких пятен. Чистый SVG — светлая hero-illustration.png на тёмном
// баннере смотрелась бы белым прямоугольником.
function HeroArt() {
  return (
    <svg className="pro-hero-art" viewBox="0 0 320 220" aria-hidden="true">
      <ellipse cx="190" cy="120" rx="130" ry="95" fill="#ffffff" opacity="0.06" />
      <ellipse cx="120" cy="170" rx="90" ry="60" fill="#3fb67f" opacity="0.35" />
      <ellipse cx="270" cy="70" rx="55" ry="45" fill="#3fb67f" opacity="0.2" />
      <g transform="rotate(-8 170 110)">
        <rect x="92" y="38" width="170" height="118" rx="12" fill="#2d3a44" />
        <rect x="102" y="48" width="150" height="98" rx="6" fill="#eef3f1" />
        <rect x="116" y="64" width="16" height="16" rx="4" fill="#cfded7" />
        <path d="M119 72l3.5 3.5 6-6.5" stroke="#22a06b" strokeWidth="2.4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        <rect x="140" y="67" width="80" height="9" rx="4.5" fill="#cfd8dc" />
        <rect x="116" y="92" width="16" height="16" rx="4" fill="#cfded7" />
        <path d="M119 100l3.5 3.5 6-6.5" stroke="#22a06b" strokeWidth="2.4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        <rect x="140" y="95" width="62" height="9" rx="4.5" fill="#cfd8dc" />
        <rect x="116" y="120" width="16" height="16" rx="4" fill="#cfded7" />
        <rect x="140" y="123" width="72" height="9" rx="4.5" fill="#dfe5e8" />
        <path d="M78 158h198l-14 18H92z" fill="#3a4852" />
        <rect x="150" y="160" width="54" height="5" rx="2.5" fill="#56646e" />
      </g>
      <circle cx="262" cy="56" r="22" fill="#22a06b" stroke="#ffffff" strokeWidth="4" />
      <path d="M252 56l7 7 13-14" stroke="#ffffff" strokeWidth="4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
