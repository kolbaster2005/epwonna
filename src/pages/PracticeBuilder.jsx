import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { exams } from '../data/examData.js'
import { useAuth } from '../contexts/AuthContext.jsx'
import { listTopics } from '../services/topicsService.js'
import { listTaskTypesForExam, generatePracticeTest } from '../services/practiceService.js'
import PageLoader from '../components/PageLoader.jsx'

// Pro-фича — тренировка по конкретной теме и/или конкретному типу
// задания вместо целого пробника. Доступна только пользователям из
// PRO_EMAILS (см. AuthContext.jsx) — сама генерация ещё раз проверяет
// это на сервере, так что случайная прямая ссылка сюда никого не
// пускает дальше формы.
export default function PracticeBuilder({ examKey }) {
  const { user, isPro } = useAuth()
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

  if (!user || !isPro) {
    return (
      <div className="notfound-page">
        <h1>Доступно в pro-версии</h1>
        <p>Тренировка по конкретной теме или типу задания — часть pro-версии платформы, которая пока в разработке.</p>
      </div>
    )
  }

  return (
    <div className="practice-builder-page">
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
