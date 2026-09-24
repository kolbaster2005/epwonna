import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { exams } from '../data/examData.js'
import { listTests } from '../services/testsService.js'
import { listTopics } from '../services/topicsService.js'
import { listAttempts } from '../services/attemptsService.js'
import GenerateProbnikModal from '../components/GenerateProbnikModal.jsx'
import { useAuth } from '../contexts/AuthContext.jsx'
import TestFilters from '../components/TestFilters.jsx'
import ExamIcon from '../components/ExamIcon.jsx'
import ExamHeroArt from '../components/ExamHeroArt.jsx'
import AboutSection from '../components/AboutSection.jsx'
import TheoryTab from '../components/TheoryTab.jsx'
import { IconList, IconClock, IconShield, IconPinFilled, IconCheckCircle, IconLock } from '../components/Icons.jsx'
import PageLoader from '../components/PageLoader.jsx'
import { pluralizeRu } from '../utils/pluralize.js'

// Temporarily hidden per product decision — the modal, state and handler
// below are untouched, this just keeps the toggle button from rendering.
// Flip back to true whenever the feature should reappear.
const SHOW_GENERATE_PROBNIK = false

// Resolves the `options: 'topics' | 'years'` shorthand in exam.filters
// into real { value, label } arrays. 'topics' fetches from the topics
// table (see topicsService.js); 'years'
// is computed from the years actually present in `tests` (the phase-
// filtered set, when the exam has phases), so it never goes stale and
// never offers a year that only exists in the other phase.
function resolveFilters(exam, tests, topics) {
  return (exam.filters || []).map((f) => {
    if (f.options === 'topics') {
      return { ...f, options: topics.map((t) => ({ value: t.id, label: t.label })) }
    }
    if (f.options === 'years') {
      const years = [...new Set(tests.map((t) => t.year))].sort((a, b) => b - a)
      return { ...f, options: years.map((y) => ({ value: String(y), label: String(y) })) }
    }
    return f
  })
}

export default function ExamPage({ examKey, initialTab = 'tests' }) {
  const exam = exams[examKey]
  const { user, isPro } = useAuth()
  const navigate = useNavigate()
  const [tab, setTab] = useState(initialTab)
  const [tests, setTests] = useState([])
  const [loading, setLoading] = useState(true)
  // EPM has no `phases` config → no switcher, phase stays null and every
  // test matches (see phaseTests below).
  const [phase, setPhase] = useState(() => exam.phases?.[0]?.value ?? null)
  const [filterValues, setFilterValues] = useState({})
  const [topics, setTopics] = useState([])
  const [genOpen, setGenOpen] = useState(false)
  // testId's the person has completed at least once, for this exam only
  // — dims the card and marks it "Пройдено" in the tests grid below.
  const [completedTestIds, setCompletedTestIds] = useState(() => new Set())

  useEffect(() => {
    listTopics(examKey).then(setTopics)
  }, [examKey])

  useEffect(() => {
    if (!user) {
      setCompletedTestIds(new Set())
      return
    }
    let cancelled = false
    listAttempts(user.id).then((allAttempts) => {
      if (cancelled) return
      const ids = allAttempts.filter((a) => a.examKey === examKey).map((a) => a.testId)
      setCompletedTestIds(new Set(ids))
    })
    return () => {
      cancelled = true
    }
  }, [user, examKey])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    listTests(examKey).then((data) => {
      if (!cancelled) {
        setTests(data.filter((t) => !t.isTaskBank && !t.isGenerated))
        setLoading(false)
      }
    })
    return () => {
      cancelled = true
    }
  }, [examKey])

  const phaseTests = useMemo(() => {
    if (!phase) return tests
    return tests.filter((t) => t.format === phase)
  }, [tests, phase])

  const resolvedFilters = useMemo(() => resolveFilters(exam, phaseTests, topics), [exam, phaseTests, topics])

  const filteredTests = useMemo(() => {
    return phaseTests.filter((test) =>
      resolvedFilters.every((f) => {
        const selected = filterValues[f.field]
        if (!selected) return true
        // A test can belong to several topics now (test.topics) — matches
        // the filter if the picked topic is any one of them, not just a
        // single exact value like the other (still scalar) filter fields.
        if (f.field === 'topic') return (test.topics || []).includes(selected)
        return String(test[f.field]) === selected
      })
    )
  }, [phaseTests, resolvedFilters, filterValues])

  function setFilter(field, value) {
    setFilterValues((prev) => ({ ...prev, [field]: value }))
  }

  function resetAll() {
    setFilterValues({})
  }

  function selectPhase(value) {
    setPhase(value)
    setFilterValues({}) // last phase's topic/year selection rarely makes sense in the other phase
  }

  return (
    <>
      <div className={`exam-hero ${exam.className}`}>
        <div className="exam-top">
          <div className="exam-tag" style={{ background: exam.color }}>
            <ExamIcon examKey={examKey} size={24} />
          </div>
          <div className="exam-title">
            <h1>{exam.title}</h1>
            <p>{exam.subtitle}</p>
          </div>
        </div>

        <div className="exam-tabs">
          <button
            className={'exam-tab' + (tab === 'tests' ? ' active' : '')}
            style={tab === 'tests' ? { color: exam.color, borderColor: exam.color } : undefined}
            onClick={() => setTab('tests')}
          >
            Пробники
          </button>
          {isPro && !exam.hidePracticeTab && (
            <Link className="exam-tab exam-tab-pro" to={`/${examKey}/practice`}>
              Тренировка <span className="pro-badge">PRO</span>
            </Link>
          )}
          {exam.theory && (
            <button
              className={'exam-tab' + (tab === 'theory' ? ' active' : '')}
              style={tab === 'theory' ? { color: exam.color, borderColor: exam.color } : undefined}
              onClick={() => setTab('theory')}
            >
              Теория
            </button>
          )}
          {exam.topicsList && (
            <button
              className={'exam-tab' + (tab === 'topics' ? ' active' : '')}
              style={tab === 'topics' ? { color: exam.color, borderColor: exam.color } : undefined}
              onClick={() => setTab('topics')}
            >
              Список тем
            </button>
          )}
          {exam.usefulMaterials && (
            <button
              className={'exam-tab' + (tab === 'materials' ? ' active' : '')}
              style={tab === 'materials' ? { color: exam.color, borderColor: exam.color } : undefined}
              onClick={() => setTab('materials')}
            >
              Полезные материалы
            </button>
          )}
          <button
            className={'exam-tab' + (tab === 'about' ? ' active' : '')}
            style={tab === 'about' ? { color: exam.color, borderColor: exam.color } : undefined}
            onClick={() => setTab('about')}
          >
            Об экзамене
          </button>
        </div>
      </div>

      {tab === 'tests' && (
        <>
          <TestFilters
            filters={resolvedFilters}
            values={filterValues}
            onChange={setFilter}
            onReset={resetAll}
            leading={
              exam.phases && (
                <div className="phase-switch">
                  {exam.phases.map((p) => (
                    <button
                      key={p.value}
                      className={'phase-switch-btn' + (phase === p.value ? ' active' : '')}
                      style={phase === p.value ? { background: exam.color } : undefined}
                      onClick={() => selectPhase(p.value)}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              )
            }
          />

          {SHOW_GENERATE_PROBNIK && user && (
            <div className="generate-probnik-block">
              <button type="button" className="btn btn-outline generate-probnik-toggle" onClick={() => setGenOpen(true)}>
                🎲 Сгенерировать пробник
              </button>
            </div>
          )}

          {genOpen && (
            <GenerateProbnikModal
              examKey={examKey}
              userId={user.id}
              topics={topics}
              onClose={() => setGenOpen(false)}
              onGenerated={(testId) => {
                setGenOpen(false)
                navigate(`/${examKey}/probnik/${testId}`)
              }}
            />
          )}

          {loading ? (
            <PageLoader />
          ) : filteredTests.length === 0 ? (
            <div className="tests-empty">Ничего не найдено по выбранным фильтрам.</div>
          ) : (
            <div className="tests-grid">
              {filteredTests.map((test) => {
                const isCompleted = completedTestIds.has(test.id)
                return (
                <Link
                  className={`test-card ${exam.className}` + (isCompleted ? ' completed' : '')}
                  to={`/${examKey}/probnik/${test.id}`}
                  key={test.id}
                >
                  {(test.isPinned || isCompleted || (test.requiresAuth && !user)) && (
                    <div className="test-card-badges">
                      {test.isPinned && (
                        <span className="test-pinned-badge" title="Закреплён">
                          <IconPinFilled size={13} />
                        </span>
                      )}
                      {test.requiresAuth && !user && (
                        <span className="test-locked-badge" title="Доступно только авторизованным">
                          <IconLock size={12} /> Только для авторизованных
                        </span>
                      )}
                      {isCompleted && (
                        <span className="test-done-badge">
                          <IconCheckCircle size={13} /> Пройдено
                        </span>
                      )}
                    </div>
                  )}
                  <div className="test-icon-badge">
                    <ExamIcon examKey={examKey} color={exam.color} size={22} />
                  </div>
                  <h4>{test.title}</h4>
                  <p>{test.shortDescription}</p>

                  <div className="test-meta">
                    <span>
                      <IconList size={15} />{' '}
                      {test.format === 'oral'
                        ? `${test.oralTask?.stages.length ?? 0} ${pluralizeRu(test.oralTask?.stages.length ?? 0, ['этап', 'этапа', 'этапов'])}`
                        : `${test.questionCount} ${pluralizeRu(test.questionCount, ['вопрос', 'вопроса', 'вопросов'])}`}
                    </span>
                    <span><IconClock size={15} /> {test.durationMinutes} мин</span>
                    {test.isModel ? (
                      <span><IconShield size={15} /> Модель экзамена</span>
                    ) : (
                      <span><IconShield size={15} /> {test.isOfficial ? 'Официальный' : 'Неофициальный'}</span>
                    )}
                  </div>

                  <span className="test-card-cta" style={{ background: exam.color }}>
                    {test.isModel ? 'Посмотреть модель →' : 'Перейти к пробнику →'}
                  </span>
                </Link>
                )
              })}
            </div>
          )}
        </>
      )}

      {tab === 'about' && (
        <div className="about-layout">
          <div className="about-text">
            {exam.topicsLink && (
              <p>
                <a className="about-toplink" href={exam.topicsLink} target="_blank" rel="noreferrer">
                  Список тем
                </a>
              </p>
            )}
            {exam.about.map((section, i) => (
              <AboutSection section={section} exam={exam} key={i} />
            ))}
          </div>

          <ExamHeroArt examKey={examKey} exam={exam} />
        </div>
      )}

      {tab === 'theory' && exam.theory && (
        <div className="theory-text">
          <TheoryTab theory={exam.theory} exam={exam} />
        </div>
      )}

      {tab === 'topics' && exam.topicsList && (
        <div className="about-layout">
          <div className="about-text">
            <AboutSection section={exam.topicsList} exam={exam} />
          </div>

          <ExamHeroArt examKey={examKey} exam={exam} />
        </div>
      )}

      {tab === 'materials' && exam.usefulMaterials && (
        <div className="about-layout">
          <div className="about-text">
            <AboutSection section={exam.usefulMaterials} exam={exam} />
          </div>

          <ExamHeroArt examKey={examKey} exam={exam} />
        </div>
      )}
    </>
  )
}
