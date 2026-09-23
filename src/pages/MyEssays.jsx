import { useEffect, useState } from 'react'
import { exams } from '../data/examData.js'
import { useAuth } from '../contexts/AuthContext.jsx'
import { useDialog } from '../contexts/DialogContext.jsx'
import { listEssaySubmissions, deleteEssaySubmission } from '../services/essaysService.js'
import { getLatestEssayReviewsByEssays } from '../services/essayAiService.js'
import { IconTrash } from '../components/Icons.jsx'
import EssayAiReview from '../components/EssayAiReview.jsx'
import PageLoader from '../components/PageLoader.jsx'

function formatShortDate(iso) {
  return new Date(iso).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' })
}

// Список сохранённых essay_choice-сочинений (сам текст, как был
// написан). Кнопка «Показать ИИ отчёт» под каждым сочинением тоже
// здесь — временно видна только админу (см. isAdmin ниже), пока
// фича обкатывается; когда будет готова для всех, достаточно убрать
// это условие. Сама проверка (запуск) по-прежнему только в
// TestPage.jsx — здесь только читаем уже готовый результат.
export default function MyEssays() {
  const { user, isAdmin, isPro } = useAuth()
  const { confirm, alertMessage } = useDialog()
  const [essays, setEssays] = useState([])
  const [loading, setLoading] = useState(true)
  const [openId, setOpenId] = useState(null)
  const [reviews, setReviews] = useState(new Map())
  const [openReviewId, setOpenReviewId] = useState(null)

  useEffect(() => {
    if (!user) {
      setEssays([])
      setLoading(false)
      return undefined
    }
    let cancelled = false
    setLoading(true)
    listEssaySubmissions(user.id).then((list) => {
      if (cancelled) return
      setEssays(list)
      setLoading(false)
      if (isAdmin) {
        getLatestEssayReviewsByEssays(list).then((map) => {
          if (!cancelled) setReviews(map)
        })
      }
    })
    return () => {
      cancelled = true
    }
  }, [user, isAdmin])

  async function handleDelete(essay) {
    if (!(await confirm('Удалить это сочинение? Действие необратимо.'))) return
    try {
      await deleteEssaySubmission(essay.id)
      setEssays((prev) => prev.filter((e) => e.id !== essay.id))
    } catch (err) {
      await alertMessage(err.message || 'Не удалось удалить сочинение.')
    }
  }

  async function handleShowAiReport(essay) {
    if (!isPro) {
      await alertMessage('Отчёт ИИ по сочинению доступен только с PRO-подпиской.')
      return
    }
    setOpenReviewId((prev) => (prev === essay.id ? null : essay.id))
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
              <PageLoader />
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
                          {isAdmin && (
                            <div className="essay-item-ai-report">
                              <button type="button" className="btn btn-outline btn-sm" onClick={() => handleShowAiReport(e)}>
                                {openReviewId === e.id ? 'Скрыть ИИ отчёт' : 'Показать ИИ отчёт'}
                              </button>
                              {openReviewId === e.id && isPro && (
                                <div className="essay-item-ai-report-panel">
                                  {reviews.has(`${e.questionId}:${e.testId}`) ? (
                                    <EssayAiReview review={reviews.get(`${e.questionId}:${e.testId}`)} showButton={false} />
                                  ) : (
                                    <p className="admin-note">Для этого сочинения ещё нет сохранённой проверки ИИ.</p>
                                  )}
                                </div>
                              )}
                            </div>
                          )}
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
