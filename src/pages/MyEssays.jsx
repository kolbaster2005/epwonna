import { useEffect, useState } from 'react'
import { exams } from '../data/examData.js'
import { useAuth } from '../contexts/AuthContext.jsx'
import { useDialog } from '../contexts/DialogContext.jsx'
import { listEssaySubmissions, deleteEssaySubmission } from '../services/essaysService.js'
import { checkEssayWithAI, getLatestEssayReviewsByQuestionIds } from '../services/essayAiService.js'
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
  // questionId -> review row (see essayAiService.js). Loaded once
  // alongside the essays themselves so opening an essay doesn't need
  // its own round-trip if it was already checked before.
  const [reviews, setReviews] = useState(new Map())
  // questionId -> true while a check is in flight, so only that one
  // essay's button shows "Проверяем…" instead of all of them at once.
  const [checkingIds, setCheckingIds] = useState(new Set())
  // questionId -> error message from the last failed check attempt.
  const [checkErrors, setCheckErrors] = useState(new Map())

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
      const reviewMap = await getLatestEssayReviewsByQuestionIds(list.map((e) => e.questionId))
      if (!cancelled) setReviews(reviewMap)
    })
    return () => {
      cancelled = true
    }
  }, [user])

  async function handleCheckWithAI(essay) {
    setCheckingIds((prev) => new Set(prev).add(essay.questionId))
    setCheckErrors((prev) => {
      const next = new Map(prev)
      next.delete(essay.questionId)
      return next
    })
    try {
      const review = await checkEssayWithAI(essay.questionId)
      setReviews((prev) => new Map(prev).set(essay.questionId, review))
    } catch (err) {
      setCheckErrors((prev) => new Map(prev).set(essay.questionId, err.message || 'Не удалось выполнить проверку.'))
    } finally {
      setCheckingIds((prev) => {
        const next = new Set(prev)
        next.delete(essay.questionId)
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
                            review={reviews.get(e.questionId)}
                            checking={checkingIds.has(e.questionId)}
                            error={checkErrors.get(e.questionId)}
                            onCheck={() => handleCheckWithAI(e)}
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
