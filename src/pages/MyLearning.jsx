import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { exams, examList } from '../data/examData.js'
import { useAuth } from '../contexts/AuthContext.jsx'
import { listAttempts, summarizeAttempts } from '../services/attemptsService.js'
import { listTests, listAllQuestionsForBank } from '../services/testsService.js'
import { listTopics } from '../services/topicsService.js'
import { getTopicProgress } from '../services/taskAttemptsService.js'
import ExamIcon from '../components/ExamIcon.jsx'
import { IconClock, IconChevronRight } from '../components/Icons.jsx'

// Общий процент по теме (сумма решённых из суммы всех доступных across
// Чтение/Грамматика/Письмо) — и цветовая метка к нему. Пороги — то, что
// попросили: 0% совсем красным ("ничего не делал"), дальше жёлто-
// оранжевый как среднее, от 70% зелёным.
function topicRowProgress(r) {
  const solved = r.reading.solved + r.grammar.solved + r.writing.solved
  const total = r.reading.total + r.grammar.total + r.writing.total
  if (total === 0) return null
  const percent = Math.round((solved / total) * 100)
  const band = percent === 0 ? 'empty' : percent < 70 ? 'mid' : 'good'
  return { percent, band }
}

function formatShortDate(iso) {
  return new Date(iso).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' })
}

// Simple hand-rolled line chart — no charting library is installed in
// this project. One line per subject, each in that subject's own brand
// color, each scaled independently along the x-axis by its own attempt
// sequence (not a shared calendar timeline — with three subjects
// potentially having attempts on completely different dates, aligning
// them to one real timeline would leave most lines mostly empty space).
function ProgressChart({ series }) {
  const w = 560
  const h = 200
  const padding = 32

  return (
    <div>
      <div className="progress-chart-legend">
        {series.map((s) => (
          <span className="progress-chart-legend-item" key={s.examKey}>
            <span className="progress-chart-legend-dot" style={{ background: s.color }} />
            {s.label}
          </span>
        ))}
      </div>

      <svg viewBox={`0 0 ${w} ${h}`} className="progress-chart" role="img" aria-label="Динамика результатов по предметам">
        {[0, 25, 50, 75, 100].map((v) => {
          const y = h - padding - (v / 100) * (h - padding * 2)
          return (
            <g key={v}>
              <line x1={padding} y1={y} x2={w - padding} y2={y} stroke="#E6EAF2" strokeWidth="1" />
              <text x={4} y={y + 3} fontSize="10" fill="#7A8699">{v}%</text>
            </g>
          )
        })}

        {series.map((s) => {
          const stepX = s.points.length > 1 ? (w - padding * 2) / (s.points.length - 1) : 0
          const points = s.points.map((p, i) => ({
            ...p,
            x: padding + i * stepX,
            y: h - padding - (p.scorePercent / 100) * (h - padding * 2),
          }))
          const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x} ${p.y}`).join(' ')
          return (
            <g key={s.examKey}>
              <path d={linePath} fill="none" style={{ stroke: s.color }} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              {points.map((p, i) => (
                <circle key={i} cx={p.x} cy={p.y} r="4" style={{ fill: s.color }} stroke="#fff" strokeWidth="1.5" />
              ))}
            </g>
          )
        })}
      </svg>
    </div>
  )
}

export default function MyLearning() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [attempts, setAttempts] = useState([])
  const [subjectProgress, setSubjectProgress] = useState([])
  const [topicProgress, setTopicProgress] = useState([]) // [{ examKey, rows: { topicId: {...} } }]
  // Какой предмет сейчас показан в карусели «Прогресс по темам» — один
  // за раз, а не все предметы подряд друг под другом.
  const [topicCarouselIndex, setTopicCarouselIndex] = useState(0)

  useEffect(() => {
    if (!user) {
      setAttempts([])
      setSubjectProgress([])
      setTopicProgress([])
      setLoading(false)
      return undefined
    }
    let cancelled = false
    setLoading(true)
    Promise.all([
      listAttempts(user.id),
      Promise.all(examList.map((e) => listTests(e.key))),
      Promise.all(examList.map((e) => listAllQuestionsForBank(e.key))),
      Promise.all(examList.map((e) => listTopics(e.key))),
    ]).then(async ([attemptsList, testsByExam, tasksByExam, topicsByExam]) => {
      if (cancelled) return
      setAttempts(attemptsList)
      setSubjectProgress(
        examList.map((e, i) => {
          // Real practice tests only — excludes oral (no scoring yet)
          // and models (demonstrations, not something to "complete").
          const totalTests = testsByExam[i].filter((t) => t.format !== 'oral' && !t.isModel && !t.isTaskBank && !t.isGenerated).length
          const examAttempts = attemptsList.filter((a) => a.examKey === e.key)
          return { examKey: e.key, ...summarizeAttempts(examAttempts, totalTests) }
        })
      )
      const topicRows = await Promise.all(
        examList.map((e, i) => getTopicProgress(user.id, e.key, tasksByExam[i], topicsByExam[i]))
      )
      if (cancelled) return
      setTopicProgress(
        examList.map((e, i) => ({ examKey: e.key, rows: topicRows[i] })).filter((t) => Object.keys(t.rows).length > 0)
      )
      setLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [user])

  const recentAttempts = attempts.slice(0, 5)

  // One series per subject — own color, own chronological order, only
  // included once there are at least 2 scored attempts (nothing to draw
  // a line between otherwise).
  const chartSeries = examList
    .map((e) => ({
      examKey: e.key,
      label: e.label,
      color: e.color,
      points: attempts
        .filter((a) => a.examKey === e.key && a.scorePercent != null)
        .slice()
        .reverse()
        .slice(-10)
        .map((a) => ({ date: a.completedAt, scorePercent: a.scorePercent })),
    }))
    .filter((s) => s.points.length >= 2)

  return (
    <div className="mylearning-page">
      <div className="admin-header">
        <div>
          <h1>Мой прогресс</h1>
          <p>Личный прогресс по выбранным предметам.</p>
        </div>
      </div>

      {!user ? (
        <p className="admin-note">Войдите, чтобы видеть свой прогресс по пробникам.</p>
      ) : loading ? (
        <p className="admin-note">Загрузка…</p>
      ) : (
        <div className="mylearning-grid">
          <section className="widget-card">
            <h2>Прогресс по предметам</h2>
            <div className="subject-progress-list">
              {subjectProgress.map((p) => {
                const exam = exams[p.examKey]
                const pct = p.total > 0 ? Math.round((p.completed / p.total) * 100) : 0
                return (
                  <div className="subject-progress-row" key={p.examKey}>
                    <div className="subject-progress-head">
                      <span className="subject-progress-icon" style={{ background: exam.color }}>
                        <ExamIcon examKey={p.examKey} size={15} />
                      </span>
                      <span className="subject-progress-label">{exam.label}</span>
                      <span className="subject-progress-count">{p.completed} из {p.total}</span>
                    </div>
                    <div className="progress-bar">
                      <div className="progress-bar-fill" style={{ width: `${pct}%`, background: exam.color }} />
                    </div>
                    <div className="subject-progress-meta">
                      {p.completed > 0 ? (
                        <><IconClock size={14} /> Среднее время на пробник: {p.avgMinutes} мин</>
                      ) : (
                        'Пока не пройдено ни одного пробника'
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </section>

          <section className="widget-card">
            <h2>Последние пробники</h2>
            {recentAttempts.length === 0 ? (
              <p className="admin-note">Вы ещё не завершали ни одного пробника — они появятся здесь.</p>
            ) : (
              <ul className="recent-list">
                {recentAttempts.map((a) => {
                  const exam = exams[a.examKey]
                  return (
                    <li key={a.id}>
                      <Link className="recent-item" to={`/my-learning/attempt/${a.id}`}>
                        <span className="recent-badge" style={{ background: exam.color }}>{exam.label}</span>
                        <span className="recent-title">{a.testTitle}</span>
                        <span className="recent-score">{a.scorePercent != null ? `${a.scorePercent}%` : '—'}</span>
                        <span className="recent-date">{formatShortDate(a.completedAt)}</span>
                      </Link>
                    </li>
                  )
                })}
              </ul>
            )}
          </section>

          <section className="widget-card wide">
            <div className="topic-progress-head">
              <h2>Прогресс по темам</h2>
              {topicProgress.length > 1 && (
                <div className="topic-progress-nav">
                  <button
                    type="button"
                    className="topic-progress-nav-btn"
                    aria-label="Предыдущий предмет"
                    onClick={() => setTopicCarouselIndex((i) => (i - 1 + topicProgress.length) % topicProgress.length)}
                  >
                    <IconChevronRight size={16} className="topic-progress-nav-prev" />
                  </button>
                  <span className="topic-progress-nav-label">
                    {exams[topicProgress[topicCarouselIndex]?.examKey]?.label}
                  </span>
                  <button
                    type="button"
                    className="topic-progress-nav-btn"
                    aria-label="Следующий предмет"
                    onClick={() => setTopicCarouselIndex((i) => (i + 1) % topicProgress.length)}
                  >
                    <IconChevronRight size={16} />
                  </button>
                </div>
              )}
            </div>
            {topicProgress.length === 0 ? (
              <p className="admin-note">Как только в банке заданий появятся темы, здесь будет видно, сколько заданий по каждой из них уже решено.</p>
            ) : (
              (() => {
                const current = topicProgress[topicCarouselIndex] || topicProgress[0]
                return (
                  <div className="topic-progress-exam">
                    <div className="topic-progress-table-scroll">
                      <table className="topic-progress-table">
                        <thead>
                          <tr>
                            <th>Тема</th>
                            <th>Чтение</th>
                            <th>Грамматика</th>
                            <th>Письмо</th>
                            <th>Прогресс</th>
                          </tr>
                        </thead>
                        <tbody>
                          {Object.entries(current.rows).map(([topicId, r]) => {
                            const progress = topicRowProgress(r)
                            return (
                              <tr key={topicId}>
                                <td>{r.label}</td>
                                <td>{r.reading.total > 0 ? `${r.reading.solved} из ${r.reading.total}` : '—'}</td>
                                <td>{r.grammar.total > 0 ? `${r.grammar.solved} из ${r.grammar.total}` : '—'}</td>
                                <td>{r.writing.total > 0 ? `${r.writing.solved} из ${r.writing.total}` : '—'}</td>
                                <td>
                                  {progress ? (
                                    <span className={`topic-progress-badge topic-progress-badge-${progress.band}`}>
                                      {progress.percent}%
                                    </span>
                                  ) : (
                                    '—'
                                  )}
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )
              })()
            )}
          </section>

          <section className="widget-card wide">
            <h2>Динамика результатов</h2>
            {chartSeries.length === 0 ? (
              <p className="admin-note">Пройдите хотя бы два пробника по одному предмету, чтобы увидеть динамику результатов.</p>
            ) : (
              <ProgressChart series={chartSeries} />
            )}
          </section>
        </div>
      )}
    </div>
  )
}
