import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { exams } from '../data/examData.js'
import { useAuth } from '../contexts/AuthContext.jsx'
import { listTopics } from '../services/topicsService.js'
import { listTaskTypesForExam, generatePracticeTest } from '../services/practiceService.js'
import PageLoader from '../components/PageLoader.jsx'
import { IconHome, IconChevronRight } from '../components/Icons.jsx'

// Тренировка по конкретной теме и/или конкретному типу задания вместо
// целого пробника — пока внутренний инструмент только для админа (см.
// AuthContext.jsx), не часть pro-версии для обычных пользователей.
// Сама генерация на сервере всё ещё проверяет PRO_EMAILS (см.
// generate-practice-test/index.ts) — сейчас это тот же единственный
// аккаунт, так что ничего не ломает, но если PRO когда-нибудь продастся
// реальным людям, этот серверный чек тоже надо будет поменять на
// is_admin, иначе случайная прямая ссылка сюда пустит pro-клиента.
export default function PracticeBuilder({ examKey }) {
  const { user, isAdmin } = useAuth()
  const navigate = useNavigate()
  const exam = exams[examKey]

  const [topics, setTopics] = useState([])
  const [taskTypes, setTaskTypes] = useState([])
  const [topicId, setTopicId] = useState('')
  const [taskType, setTaskType] = useState('')
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    setLoading(true)
    Promise.all([listTopics(examKey), listTaskTypesForExam(examKey)]).then(([t, tt]) => {
      setTopics(t)
      setTaskTypes(tt)
      setLoading(false)
    })
  }, [examKey])

  async function handleGenerate() {
    setError('')
    setGenerating(true)
    try {
      const result = await generatePracticeTest({ examKey, topicId, taskType })
      navigate(`/${examKey}/test/${result.testId}`)
    } catch (err) {
      setError(err.message || 'Не удалось собрать тренировку.')
      setGenerating(false)
    }
  }

  const breadcrumb = (
    <nav className="breadcrumb">
      <Link to="/" aria-label="Главная"><IconHome size={16} /></Link>
      <IconChevronRight size={14} className="breadcrumb-sep" />
      <Link to={`/${examKey}`}>{exam?.label}</Link>
      <IconChevronRight size={14} className="breadcrumb-sep" />
      <span>Тренировка</span>
    </nav>
  )

  if (!user || !isAdmin) {
    return (
      <div className="practice-builder-page">
        {breadcrumb}
        <div className="notfound-page">
          <h1>Страница недоступна</h1>
          <p>Эта страница ещё в разработке.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="practice-builder-page">
      {breadcrumb}
      <div className="admin-header">
        <div>
          <h1>Тренировка · {exam?.label}</h1>
          <p>Выберите тему и/или тип задания — соберём короткую тренировку только из них.</p>
        </div>
      </div>

      {loading ? (
        <PageLoader />
      ) : (
        <div className="practice-builder-form">
          <label className="admin-field">
            <span>Тема (необязательно)</span>
            <select value={topicId} onChange={(e) => setTopicId(e.target.value)}>
              <option value="">Любая тема</option>
              {topics.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.label}
                </option>
              ))}
            </select>
          </label>

          <label className="admin-field">
            <span>Тип задания (необязательно)</span>
            <select value={taskType} onChange={(e) => setTaskType(e.target.value)}>
              <option value="">Любой тип</option>
              {taskTypes.map((tt) => (
                <option key={tt} value={tt}>
                  {tt}
                </option>
              ))}
            </select>
          </label>

          {error && <p className="auth-error">{error}</p>}

          <button
            type="button"
            className="btn btn-primary"
            disabled={generating || (!topicId && !taskType)}
            onClick={handleGenerate}
          >
            {generating ? 'Собираем…' : 'Начать тренировку'}
          </button>
          {!topicId && !taskType && <p className="practice-builder-hint">Выберите хотя бы тему или тип задания.</p>}
        </div>
      )}
    </div>
  )
}
