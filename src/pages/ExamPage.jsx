import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { exams } from '../data/examData.js'
import { listTests } from '../services/testsService.js'
import { listTopics } from '../services/topicsService.js'
import GenerateProbnikModal from '../components/GenerateProbnikModal.jsx'
import { useAuth } from '../contexts/AuthContext.jsx'
import TestFilters from '../components/TestFilters.jsx'
import ExamIcon from '../components/ExamIcon.jsx'
import ExamHeroArt from '../components/ExamHeroArt.jsx'
import AboutSection from '../components/AboutSection.jsx'
import { IconList, IconClock, IconShield, IconPinFilled } from '../components/Icons.jsx'
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
  const { user } = useAuth()
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

  useEffect(() => {
    listTopics(examKey).then(setTopics)
  }, [examKey])

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
      <div className="exam-hero">
        <div className="exam-top">
          <div className="exam-tag" style={{ background: exam.color }}>
            <ExamIcon examKey={examKey} size={22} />
          </div>
          <div className="exam-title">
            <h1>{exam.title}</h1>
            <p>{exam.subtitle}</p>
          </div>
        </div>

        <div className="exam-tabs">
          <button className={'exam-tab' + (tab === 'tests' ? ' active' : '')} onClick={() => setTab('tests')}>
            Пробники
          </button>
          <button className={'exam-tab' + (tab === 'about' ? ' active' : '')} onClick={() => setTab('about')}>
            Об экзамене
          </button>
          {exam.theory && (
            <button className={'exam-tab' + (tab === 'theory' ? ' active' : '')} onClick={() => setTab('theory')}>
              Теория
            </button>
          )}
          {exam.topicsList && (
            <button className={'exam-tab' + (tab === 'topics' ? ' active' : '')} onClick={() => setTab('topics')}>
              Список тем
            </button>
          )}
          {exam.usefulMaterials && (
            <button className={'exam-tab' + (tab === 'materials' ? ' active' : '')} onClick={() => setTab('materials')}>
              Полезные материалы
            </button>
          )}
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
            <div className="tests-empty">Загрузка пробников…</div>
          ) : filteredTests.length === 0 ? (
            <div className="tests-empty">Ничего не найдено по выбранным фильтрам.</div>
          ) : (
            <div className="tests-grid">
              {filteredTests.map((test) => (
                <Link className={`test-card ${exam.className}`} to={`/${examKey}/probnik/${test.id}`} key={test.id}>
                  {test.isPinned && (
                    <span className="test-pinned-badge" title="Закреплён">
                      <IconPinFilled size={13} />
                    </span>
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
              ))}
            </div>
          )}
        </>
      )}

      {tab === 'about' && (
        <div className="about-layout">
          <div className="about-text">
            {exam.about.map((section, i) => (
              <AboutSection section={section} exam={exam} key={i} />
            ))}
          </div>

          <ExamHeroArt examKey={examKey} exam={exam} />
        </div>
      )}

      {tab === 'theory' && exam.theory && (
        <div className="about-layout">
          <div className="about-text">
            <AboutSection section={exam.theory} exam={exam} />
          </div>

          <ExamHeroArt examKey={examKey} exam={exam} />
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
