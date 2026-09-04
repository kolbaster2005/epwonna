import { useEffect, useState } from 'react'
import { exams } from '../data/examData.js'
import { useAuth } from '../contexts/AuthContext.jsx'
import { useDialog } from '../contexts/DialogContext.jsx'
import { listEssaySubmissions, deleteEssaySubmission } from '../services/essaysService.js'
import { checkEssayWithAI, getLatestEssayReviewsByEssays, getTodayEssayCheckUsage } from '../services/essayAiService.js'
import EssayAiReview from '../components/EssayAiReview.jsx'
import { IconTrash } from '../components/Icons.jsx'

function formatShortDate(iso) {
  return new Date(iso).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' })
}

export default function MyEssays() {
  const { user } = useAuth()
  const { confirm, alertMessage } = useDialog()
  const [essays, setEssays] = useState([])
  const [loading, setLoading] = useState(true)
  const [openId, setOpenId] = useState(null)
  // `${questionId}:${testId}` -> review row (see essayAiService.js).
  // Loaded once alongside the essays themselves so opening an essay
  // doesn't need its own round-trip if it was already checked before.
  // Composite key because the same task can appear more than once in
  // this list — solved separately in two different probniks — and each
  // occurrence needs its own review, not a shared one.
  const [reviews, setReviews] = useState(new Map())
  // essay.id -> true while a check is in flight, so only that one
  // essay's button shows "Проверяем…" instead of all of them at once
  // (essay.id, not questionId, for the same reused-task reason as above).
  const [checkingIds, setCheckingIds] = useState(new Set())
  // essay.id -> error message from the last failed check attempt.
  const [checkErrors, setCheckErrors] = useState(new Map())

  // Дневной лимит общий на пользователя (не на конкретное сочинение) —
  // одно состояние на всю страницу, обновляется после любой проверки,
  // с какой бы карточки её ни запустили.
  const [essayUsage, setEssayUsage] = useState(null)

  useEffect(() => {
    if (!user) {
      setEssays([])
      setLoading(false)
      return undefined
    }
    let cancelled = false
    setLoading(true)
    listEssaySubmissions(user.id).then(async (list) => {
      if (cancelled) return
      setEssays(list)
      setLoading(false)
      const reviewMap = await getLatestEssayReviewsByEssays(list)
      if (!cancelled) setReviews(reviewMap)
    })
    getTodayEssayCheckUsage(user.id).then((u) => {
      if (!cancelled) setEssayUsage(u)
    })
    return () => {
      cancelled = true
    }
  }, [user])

  async function handleCheckWithAI(essay) {
    setCheckingIds((prev) => new Set(prev).add(essay.id))
    setCheckErrors((prev) => {
      const next = new Map(prev)
      next.delete(essay.id)
      return next
    })
    try {
      const review = await checkEssayWithAI(essay.questionId, essay.testId)
      setReviews((prev) => new Map(prev).set(`${essay.questionId}:${essay.testId}`, review))
      if (review.usage) setEssayUsage(review.usage)
    } catch (err) {
      setCheckErrors((prev) => new Map(prev).set(essay.id, err.message || 'Не удалось выполнить проверку.'))
      if (err.usage) setEssayUsage(err.usage)
    } finally {
      setCheckingIds((prev) => {
        const next = new Set(prev)
        next.delete(essay.id)
        return next
      })
    }
  }

  async function handleDelete(essay) {
    if (!(await confirm('Удалить это сочинение? Действие необратимо.'))) return
    try {
      await deleteEssaySubmission(essay.id)
      setEssays((prev) => prev.filter((e) => e.id !== essay.id))
    } catch (err) {
      await alertMessage(err.message || 'Не удалось удалить сочинение.')
    }
  }

  return (
    <div className="mylearning-page">
      <div className="admin-header">
        <div>
          <h1>Мои сочинения</h1>
          <p>Письменные работы, сохранённые из письменных частей пробников.</p>
        </div>
      </div>

      {!user ? (
        <p className="admin-note">Войдите, чтобы увидеть свои сохранённые сочинения.</p>
      ) : (
        <div className="mylearning-grid">
          <section className="widget-card wide">
            <h2>Сохранённые работы</h2>
            {loading ? (
              <p className="admin-note">Загрузка…</p>
            ) : essays.length === 0 ? (
              <p className="admin-note">
                Пока нет сохранённых сочинений — они появятся здесь после того, как вы напишете и отправите
                письменное задание (Schreibaufgabe) в одном из пробников.
              </p>
            ) : (
              <ul className="essay-list">
                {essays.map((e) => {
                  const exam = exams[e.examKey]
                  const isOpen = openId === e.id
                  return (
                    <li className="essay-item" key={e.id}>
                      <div className="essay-item-head">
                        <button
                          type="button"
                          className="essay-item-head-toggle"
                          onClick={() => setOpenId(isOpen ? null : e.id)}
                        >
                          {exam && <span className="recent-badge" style={{ background: exam.color }}>{exam.label}</span>}
                          <span className="essay-item-title">{e.choiceTitle || 'Сочинение'}</span>
                          <span className="essay-item-date">{formatShortDate(e.updatedAt)}</span>
                          <span className="essay-item-toggle">{isOpen ? '▲' : '▼'}</span>
                        </button>
                        <button
                          type="button"
                          className="essay-item-delete"
                          onClick={() => handleDelete(e)}
                          aria-label="Удалить сочинение"
                        >
                          <IconTrash size={15} />
                        </button>
                      </div>
                      {isOpen && (
                        <div className="essay-item-body">
                          {e.text}
                          <EssayAiReview
                            review={reviews.get(`${e.questionId}:${e.testId}`)}
                            checking={checkingIds.has(e.id)}
                            error={checkErrors.get(e.id)}
                            onCheck={() => handleCheckWithAI(e)}
                            usage={essayUsage}
                          />
                        </div>
                      )}
                    </li>
                  )
                })}
              </ul>
            )}
          </section>
        </div>
      )}
    </div>
  )
}
