import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { visibleExamList } from '../data/examData.js'
import { useAuth } from '../contexts/AuthContext.jsx'
import { useDialog } from '../contexts/DialogContext.jsx'
import { avatarOptions, avatarSrcById } from '../data/avatars.js'
import { listAttempts, summarizeAttempts, getLatestDraftAttempt } from '../services/attemptsService.js'
import { listTests, getTest, listAllQuestionsForBank } from '../services/testsService.js'
import { listTopics } from '../services/topicsService.js'
import { getTopicProgress } from '../services/taskAttemptsService.js'
import { getExamCountdown, daysUntil } from '../services/examCountdownService.js'
import { groupByCategory } from '../utils/testLayout.js'
import { hasAnswer, defaultValue, getVerdictWithSelfGrade, questionPoints } from '../utils/grading.js'
import ExamIcon from '../components/ExamIcon.jsx'
import PageLoader from '../components/PageLoader.jsx'
import {
  IconArrowRight,
  IconCalendar,
  IconBook,
  IconEdit,
  IconNoAvatar,
  IconSliders,
  IconSearch,
  IconList,
  IconCheckCircle,
} from '../components/Icons.jsx'
import { pluralizeRu } from '../utils/pluralize.js'

// Кольцо прогресса в карточках: r=26 в viewBox 64×64.
const RING_RADIUS = 26
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS

// Пробники, которые считаются в прогрессе: письменные, не модели, не
// банк заданий и не сгенерированные.
function isCountedTest(t) {
  return t.format !== 'oral' && !t.isModel && !t.isTaskBank && !t.isGenerated
}

// Разбивка по разделам в карточке черновика — сколько вопросов в каждой
// категории уже отвечено (не баллы — пробник ещё не закончен и не
// проверен). Та же group-by-category логика, что в TestPage.jsx.
function draftCategoryBreakdown(test, answers) {
  if (!test) return []
  return groupByCategory(test.questions).map((group) => {
    const total = group.items.length
    const answered = group.items.filter(({ question: q }) => hasAnswer(q, answers?.[q.id] ?? defaultValue(q.type))).length
    return { name: group.name, answered, total }
  })
}

// Разбивка по разделам в карточке завершённого пробника — уже баллы
// (questionPoints), та же формула, что на экране результатов TestPage.jsx.
function completedCategoryBreakdown(test, snapshot) {
  if (!test) return []
  const answers = snapshot?.answers || {}
  const selfGrades = snapshot?.selfGrades || {}
  return groupByCategory(test.questions)
    .map((group) => {
      const totals = group.items.reduce(
        (sum, { question: q }) => {
          const value = answers[q.id] ?? defaultValue(q.type)
          const verdict = getVerdictWithSelfGrade(q, value, selfGrades[q.id])
          const { earned, possible } = questionPoints(q, value, verdict, selfGrades[q.id])
          return { earned: sum.earned + earned, possible: sum.possible + possible }
        },
        { earned: 0, possible: 0 }
      )
      return { name: group.name, ...totals }
    })
    .filter((c) => c.possible > 0)
}

function formatPoints(n) {
  return Number.isInteger(n) ? String(n) : n.toFixed(1)
}

// Цвет по проценту прогресса/результата — общий для полоски заполнения
// черновика и кольца+процентов завершённого пробника: ниже 70% —
// оранжевый, 70%+ — зелёный. Без красного — два цвета достаточно.
function progressColor(percent) {
  return percent >= 70 ? '#22a06b' : '#f2a537'
}

// Личный кабинет для pro-пользователей — полностью заменяет собой
// обычную главную (см. Home.jsx: isPro рендерит этот компонент вместо
// себя), внутри ProLayout.jsx.
export default function ProDashboard() {
  const { user, profile, isAdmin, isPro, updateAvatar } = useAuth()
  const { alertMessage } = useDialog()
  const [loading, setLoading] = useState(true)
  const [draft, setDraft] = useState(null)
  const [draftTest, setDraftTest] = useState(null)
  const [lastAttempt, setLastAttempt] = useState(null)
  const [lastAttemptTest, setLastAttemptTest] = useState(null)
  const [attempts, setAttempts] = useState([])
  const [testsByExam, setTestsByExam] = useState({})
  const [countdown, setCountdown] = useState(null)
  const [topicStats, setTopicStats] = useState({})
  // Пикер аватарки в виджете профиля — раньше жил в шапке (UserMenu),
  // шапки у pro-раскладки больше нет, см. ProLayout.jsx.
  const [avatarPickerOpen, setAvatarPickerOpen] = useState(false)
  // «Мои экзамены» — вкладка-фильтр («Все» или конкретный предмет) и
  // поиск по названию, раскрывающийся по иконке лупы в мини-меню.
  const [examFilter, setExamFilter] = useState('all')
  const [examSearchOpen, setExamSearchOpen] = useState(false)
  const [examSearch, setExamSearch] = useState('')

  const examList = visibleExamList()
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
    ])
      .then(([latestDraft, attemptsList, testsLists, countdownData]) => {
        if (cancelled) return

        setCountdown(countdownData)
        const byExam = Object.fromEntries(examList.map((e, i) => [e.key, testsLists[i]]))
        setTestsByExam(byExam)
        setAttempts(attemptsList)

        // Черновик/попытка по скрытому от пользователя предмету не показываем.
        const visibleDraft = latestDraft && byExam[latestDraft.examKey] ? latestDraft : null
        setDraft(visibleDraft)
        const visibleLastAttempt = attemptsList.find((a) => byExam[a.examKey]) || null
        setLastAttempt(visibleLastAttempt)

        // Этим можно уже отрисовать карточки пробников и список предметов
        // с числом пройденных пробников — не ждём более медленную
        // разбивку по темам/баллам ниже (на каждый предмет ещё по 3
        // запроса), она дозагрузится следом и обновит экран сама по
        // себе через отдельные setState, без общего спиннера.
        setLoading(false)

        Promise.all([
          visibleDraft ? getTest(visibleDraft.examKey, visibleDraft.testId) : null,
          visibleLastAttempt ? getTest(visibleLastAttempt.examKey, visibleLastAttempt.testId) : null,
          Promise.all(
            examList.map(async (e) => {
              const [tasks, topics] = await Promise.all([listAllQuestionsForBank(e.key), listTopics(e.key)])
              const rows = await getTopicProgress(user.id, e.key, tasks, topics)
              const total = Object.keys(rows).length
              const done = Object.values(rows).filter(
                (r) =>
                  r.reading.solved + r.grammar.solved + r.writing.solved ===
                  r.reading.total + r.grammar.total + r.writing.total
              ).length
              return [e.key, { done, total }]
            })
          ),
        ]).then(([draftTestFull, lastTestFull, topicStatsEntries]) => {
          if (cancelled) return
          setDraftTest(draftTestFull)
          setLastAttemptTest(lastTestFull)
          setTopicStats(Object.fromEntries(topicStatsEntries))
        })
      })
      .catch(() => {
        if (!cancelled) setLoading(false)
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
        return { exam, ...summary, percent }
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [testsByExam, attempts, examListKey]
  )

  if (loading) return <PageLoader />

  const displayName = user?.email?.split('@')[0] || ''
  const avatarLetter = user?.email?.[0]?.toUpperCase() || '?'
  const avatarSrc = profile?.avatar_key ? avatarSrcById(profile.avatar_key) : null
  const roleLabel = isAdmin ? 'Администратор' : isPro ? 'PRO-аккаунт' : 'Студент'

  async function handlePickAvatar(avatarKey) {
    try {
      await updateAvatar(avatarKey)
      setAvatarPickerOpen(false)
    } catch (err) {
      await alertMessage(err.message || 'Не удалось сохранить аватар.')
    }
  }

  const totalCompleted = courses.reduce((sum, c) => sum + c.completed, 0)
  const totalTests = courses.reduce((sum, c) => sum + c.total, 0)

  // Дату экзамена задаёт админ (/admin/exam-countdown), дни считаем от
  // сегодняшнего дня — число само уменьшается каждый день. Нет даты или
  // она уже прошла — виджет не показываем.
  const daysLeft = countdown?.examDate ? daysUntil(countdown.examDate) : null
  const showCountdown = daysLeft !== null && daysLeft >= 0

  const draftBreakdown = draftCategoryBreakdown(draftTest, draft?.answersSnapshot?.answers)
  const draftAnswered = draftBreakdown.reduce((sum, c) => sum + c.answered, 0)
  const draftTotalQuestions = draftBreakdown.reduce((sum, c) => sum + c.total, 0)
  const draftPercent = draftTotalQuestions > 0 ? Math.round((draftAnswered / draftTotalQuestions) * 100) : 0

  const completedBreakdown = completedCategoryBreakdown(lastAttemptTest, lastAttempt?.answersSnapshot)

  return (
    <div className="pro-dash">
      <div className="pro-dash-grid">
        {/* ---- Левая колонка ------------------------------------------- */}
        <div className="pro-dash-col">
          <section className="pro-dash-block">
            <div className="pro-section-head">
              <h2>Мои пробники</h2>
            </div>
            <div className="pro-probnik-cards">
              {/* Карточка 1 — текущий черновик, одна кнопка «Продолжить». */}
              {draft ? (
                <div className="pro-probnik-card">
                  <div className="pro-probnik-card-top">
                    <div className="pro-track-ring">
                      <svg viewBox="0 0 64 64" aria-hidden="true">
                        <circle className="pro-track-ring-bg" cx="32" cy="32" r={RING_RADIUS} />
                        <circle
                          className="pro-track-ring-fill"
                          cx="32"
                          cy="32"
                          r={RING_RADIUS}
                          strokeDasharray={RING_CIRCUMFERENCE}
                          strokeDashoffset={RING_CIRCUMFERENCE * (1 - draftPercent / 100)}
                          style={{ stroke: progressColor(draftPercent) }}
                        />
                      </svg>
                      <span className="pro-track-ring-icon" style={{ background: progressColor(draftPercent) }}>
                        <ExamIcon examKey={draft.examKey} size={16} />
                      </span>
                    </div>
                    <div className="pro-probnik-card-info">
                      <b>{draft.testTitle}</b>
                      <div className="pro-probnik-card-stats">
                        {draftBreakdown.map((c) => (
                          <span key={c.name}>{c.answered}/{c.total} {c.name}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="pro-probnik-card-bottom">
                    <div className="pro-probnik-progress" role="progressbar" aria-valuenow={draftPercent} aria-valuemin={0} aria-valuemax={100}>
                      <div
                        className="pro-probnik-progress-fill"
                        style={{ width: `${draftPercent}%`, background: progressColor(draftPercent) }}
                      />
                    </div>
                    <Link to={`/${draft.examKey}/test/${draft.testId}`} className="btn btn-primary pro-probnik-card-btn">
                      Продолжить
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="pro-probnik-card pro-probnik-card--empty">
                  <p>Незавершённых пробников нет.</p>
                  <Link to="/my-learning" className="btn btn-outline">Начать пробник</Link>
                </div>
              )}

              {/* Карточка 2 — последний завершённый, две кнопки. */}
              {lastAttempt ? (
                <div className="pro-probnik-card">
                  <div className="pro-probnik-card-top">
                    <div className="pro-track-ring">
                      <svg viewBox="0 0 64 64" aria-hidden="true">
                        <circle className="pro-track-ring-bg" cx="32" cy="32" r={RING_RADIUS} />
                        <circle
                          className="pro-track-ring-fill"
                          cx="32"
                          cy="32"
                          r={RING_RADIUS}
                          strokeDasharray={RING_CIRCUMFERENCE}
                          strokeDashoffset={RING_CIRCUMFERENCE * (1 - (lastAttempt.scorePercent ?? 0) / 100)}
                          style={{ stroke: progressColor(lastAttempt.scorePercent ?? 0) }}
                        />
                      </svg>
                      <span className="pro-track-ring-icon" style={{ background: progressColor(lastAttempt.scorePercent ?? 0) }}>
                        <ExamIcon examKey={lastAttempt.examKey} size={16} />
                      </span>
                    </div>
                    <div className="pro-probnik-card-info">
                      <b>{lastAttempt.testTitle}</b>
                      <div className="pro-probnik-card-stats">
                        {completedBreakdown.length > 0 ? (
                          completedBreakdown.map((c) => (
                            <span key={c.name}>{formatPoints(c.earned)}/{formatPoints(c.possible)} {c.name}</span>
                          ))
                        ) : (
                          <span>{lastAttempt.correctCount} из {lastAttempt.totalQuestions} верно</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="pro-probnik-card-bottom">
                    <span className="pro-probnik-card-percent" style={{ color: progressColor(lastAttempt.scorePercent ?? 0) }}>
                      {lastAttempt.scorePercent ?? 0}%
                    </span>
                    <div className="pro-probnik-card-actions">
                      <Link to={`/${lastAttempt.examKey}/test/${lastAttempt.testId}`} className="btn btn-outline pro-probnik-card-btn">
                        Пройти заново
                      </Link>
                      <Link to={`/my-learning/attempt/${lastAttempt.id}`} className="btn btn-primary pro-probnik-card-btn">
                        К результату
                      </Link>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="pro-probnik-card pro-probnik-card--empty">
                  <p>Завершённых пробников пока нет.</p>
                </div>
              )}
            </div>
          </section>

          <section className="pro-dash-block">
            <div className="pro-section-head">
              <h2>Мои экзамены</h2>
            </div>

            <div className="pro-examlist-menu">
              <div className="pro-examlist-tabs">
                <button
                  type="button"
                  className={'pro-examlist-tab' + (examFilter === 'all' ? ' active' : '')}
                  onClick={() => setExamFilter('all')}
                >
                  Все
                </button>
                {courses.map((c) => (
                  <button
                    type="button"
                    key={c.exam.key}
                    className={'pro-examlist-tab' + (examFilter === c.exam.key ? ' active' : '')}
                    onClick={() => setExamFilter(c.exam.key)}
                  >
                    {c.exam.label}
                  </button>
                ))}
              </div>
              <div className="pro-examlist-actions">
                <button
                  type="button"
                  className={'pro-examlist-action' + (examSearchOpen ? ' active' : '')}
                  onClick={() => setExamSearchOpen((v) => !v)}
                  aria-label="Поиск по предметам"
                  title="Поиск по предметам"
                >
                  <IconSearch size={16} />
                </button>
                <Link to="/personalization" className="pro-examlist-action" aria-label="Персонализация" title="Персонализация">
                  <IconSliders size={16} />
                </Link>
              </div>
            </div>

            {examSearchOpen && (
              <input
                type="text"
                className="pro-examlist-search"
                placeholder="Поиск по названию предмета…"
                value={examSearch}
                onChange={(e) => setExamSearch(e.target.value)}
                autoFocus
              />
            )}

            <div className="pro-examlist">
              {courses
                .filter((c) => examFilter === 'all' || examFilter === c.exam.key)
                .filter((c) => {
                  const q = examSearch.trim().toLowerCase()
                  if (!q) return true
                  return c.exam.label.toLowerCase().includes(q) || c.exam.homeTitle.toLowerCase().includes(q)
                })
                .map((c) => {
                  const topics = topicStats[c.exam.key]
                  return (
                    <Link to={`/${c.exam.key}`} className={`pro-examlist-item ${c.exam.className}`} key={c.exam.key}>
                      <span className="pro-examlist-icon">
                        <ExamIcon examKey={c.exam.key} color={c.exam.color} size={22} />
                      </span>
                      <span className="pro-examlist-body">
                        <b>{c.exam.label}</b>
                        <span className="pro-examlist-sub">{c.exam.homeTitle}</span>
                        <span className="pro-examlist-meta">
                          {topics && topics.total > 0 && (
                            <span><IconList size={13} /> Темы: {topics.done} из {topics.total}</span>
                          )}
                          <span><IconCheckCircle size={13} /> Пробники: {c.completed} из {c.total}</span>
                        </span>
                      </span>
                    </Link>
                  )
                })}
            </div>
          </section>
        </div>

        {/* ---- Правая колонка -------------------------------------------- */}
        <div className="pro-dash-col pro-dash-col-side">
          <section className="pro-profile-card">
            <div className="pro-profile-banner" />
            <button
              type="button"
              className="pro-profile-avatar"
              onClick={() => setAvatarPickerOpen((v) => !v)}
              aria-label="Сменить аватар"
              title="Сменить аватар"
            >
              {avatarSrc ? <img src={avatarSrc} alt="" /> : avatarLetter}
            </button>
            <div className="pro-profile-body">
              <span className="pro-profile-name-row">
                <b className="pro-profile-name" title={user?.email}>{displayName}</b>
                {isPro && <span className="pro-badge">PRO</span>}
              </span>
              <span className="pro-profile-email">{user?.email}</span>
              <span className="pro-profile-role">{roleLabel}</span>
            </div>

            {avatarPickerOpen && (
              <div className="avatar-picker pro-profile-picker">
                <button
                  type="button"
                  className={'avatar-picker-item avatar-picker-none' + (!profile?.avatar_key ? ' active' : '')}
                  onClick={() => handlePickAvatar(null)}
                  aria-label="Без фото"
                  title="Без фото"
                >
                  <IconNoAvatar size={18} />
                </button>
                {avatarOptions.map((a) => (
                  <button
                    type="button"
                    key={a.id}
                    className={'avatar-picker-item' + (profile?.avatar_key === a.id ? ' active' : '')}
                    onClick={() => handlePickAvatar(a.id)}
                    aria-label="Выбрать аватар"
                  >
                    <img src={a.src} alt="" />
                  </button>
                ))}
              </div>
            )}

            <div className="pro-profile-stats">
              <div className="pro-profile-stat">
                <b>{examList.length}</b>
                <span>{pluralizeRu(examList.length, ['предмет', 'предмета', 'предметов'])}</span>
              </div>
              <div className="pro-profile-stat">
                <b>{totalCompleted}</b>
                <span>из {totalTests} пройдено</span>
              </div>
            </div>
          </section>

          {showCountdown && (
            <section className="pro-stat-card">
              <div className="pro-stat-card-icon">
                <IconCalendar size={18} />
              </div>
              <div className="pro-stat-card-body">
                <b>{daysLeft}</b>
                <span>
                  {daysLeft === 0
                    ? 'экзамены сегодня'
                    : `${pluralizeRu(daysLeft, ['день', 'дня', 'дней'])} до экзаменов`}
                </span>
              </div>
              <span className={'pro-stat-card-badge' + (countdown.registrationOpen ? ' open' : '')}>
                {countdown.registrationOpen ? 'Регистрация открыта' : 'Регистрация не открыта'}
              </span>
            </section>
          )}

          <div className="pro-promo-row">
            <Link to="/dictionary" className="pro-promo-tile pro-promo-tile--amber">
              <span className="pro-promo-tile-icon"><IconBook size={20} /></span>
              <IconArrowRight size={14} className="pro-promo-tile-arrow" />
              <b>Словарь</b>
              <span>Новые слова и выражения</span>
            </Link>
            <Link to="/my-learning/essays" className="pro-promo-tile pro-promo-tile--violet">
              <span className="pro-promo-tile-icon"><IconEdit size={20} /></span>
              <IconArrowRight size={14} className="pro-promo-tile-arrow" />
              <b>Мои сочинения</b>
              <span>Сохранённые работы</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
