import { useEffect, useMemo, useState } from 'react'
import { exams, visibleExamList } from '../data/examData.js'
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
// здесь — видна всем, но сам отчёт доступен только PRO (см.
// handleShowAiReport ниже); не-PRO при клике видит алерт вместо
// отчёта. Сама проверка (запуск) по-прежнему только в TestPage.jsx —
// здесь только читаем уже готовый результат.
export default function MyEssays() {
  const { user, isPro } = useAuth()
  const { confirm, alertMessage } = useDialog()
  const [essays, setEssays] = useState([])
  const [loading, setLoading] = useState(true)
  // undefined = ничего ещё не трогали руками — тогда открыто первое
  // сочинение текущего списка (самое свежее при фильтре «Все», или
  // самое свежее в пределах выбранного экзамена). Как только человек
  // сам кликнул по заголовку — дальше это обычный аккордеон с одним
  // открытым id, без автоматики.
  const [openId, setOpenId] = useState(undefined)
  const [examFilter, setExamFilter] = useState('all')
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
      getLatestEssayReviewsByEssays(list).then((map) => {
        if (!cancelled) setReviews(map)
      })
    })
    return () => {
      cancelled = true
    }
  }, [user])

  // Вкладки — все предметы сразу (а не только те, где уже есть
  // сочинения) — так они не прыгают местами и не пропадают при
  // удалении последней работы по предмету; для предмета без сочинений
  // вкладка просто ведёт к пустому состоянию ниже. EPM — исключение:
  // в математике нет письменного essay_choice-задания вообще, так что
  // вкладка для неё всегда будет пустой витриной без смысла — не
  // показываем её здесь в принципе, а не просто скрываем за "пусто".
  const examTabList = visibleExamList().filter((e) => e.key !== 'epm')

  const filteredEssays = useMemo(
    () => (examFilter === 'all' ? essays : essays.filter((e) => e.examKey === examFilter)),
    [essays, examFilter]
  )

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
      ) : loading ? (
        <PageLoader />
      ) : essays.length === 0 ? (
        <p className="admin-note">
          Пока нет сохранённых сочинений — они появятся здесь после того, как вы напишете и отправите письменное
          задание (Schreibaufgabe) в одном из пробников.
        </p>
      ) : (
        <>
          <div className="exam-tabs">
            <button
              type="button"
              className={'exam-tab' + (examFilter === 'all' ? ' active' : '')}
              onClick={() => setExamFilter('all')}
            >
              Все
            </button>
            {examTabList.map((exam) => (
              <button
                type="button"
                key={exam.key}
                className={'exam-tab' + (examFilter === exam.key ? ' active' : '')}
                style={examFilter === exam.key ? { color: exam.color, borderColor: exam.color } : undefined}
                onClick={() => setExamFilter(exam.key)}
              >
                {exam.label}
              </button>
            ))}
          </div>

          {filteredEssays.length === 0 ? (
            <div className="tests-empty">Сейчас нет ни одного сочинения.</div>
          ) : (
          <ul className="essay-list">
            {filteredEssays.map((e, i) => {
              const exam = exams[e.examKey]
              const isOpen = openId === undefined ? i === 0 : openId === e.id
              return (
                <li className="essay-item" key={e.id}>
                  <div className="essay-item-head">
                    <button type="button" className="essay-item-head-toggle" onClick={() => setOpenId(isOpen ? null : e.id)}>
                      {exam && <span className="recent-badge" style={{ background: exam.color }}>{exam.label}</span>}
                      <span className="essay-item-title">{e.choiceTitle || 'Сочинение'}</span>
                      <span className="essay-item-date">{formatShortDate(e.updatedAt)}</span>
                      <span className="essay-item-toggle">{isOpen ? '▲' : '▼'}</span>
                    </button>
                    <button type="button" className="essay-item-delete" onClick={() => handleDelete(e)} aria-label="Удалить сочинение">
                      <IconTrash size={15} />
                    </button>
                  </div>
                  {isOpen && (
                    <div className="essay-item-body">
                      {e.text}
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
                    </div>
                  )}
                </li>
              )
            })}
          </ul>
          )}
        </>
      )}
    </div>
  )
}
