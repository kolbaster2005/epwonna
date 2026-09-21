import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { exams } from '../../data/examData.js'
import { listTests, deleteTest, setPinned, setRequiresAuth } from '../../services/testsService.js'
import { listTopics } from '../../services/topicsService.js'
import { pluralizeRu } from '../../utils/pluralize.js'
import { IconPin, IconPinFilled, IconEye, IconEyeOff } from '../../components/Icons.jsx'
import PageLoader from '../../components/PageLoader.jsx'
import { useDialog } from '../../contexts/DialogContext.jsx'

export default function AdminExamTests({ examKey }) {
  const exam = exams[examKey]
  const { confirm, alertMessage } = useDialog()
  const [tests, setTests] = useState([])
  const [topics, setTopics] = useState([])
  const [loading, setLoading] = useState(true)
  const [phase, setPhase] = useState(() => exam.phases?.[0]?.value ?? null)

  function reload() {
    setLoading(true)
    listTests(examKey).then((data) => {
      setTests(data)
      setLoading(false)
    })
  }

  useEffect(reload, [examKey])
  useEffect(() => {
    listTopics(examKey).then(setTopics)
  }, [examKey])

  const visibleTests = useMemo(() => {
    const real = tests.filter((t) => !t.isTaskBank && !t.isGenerated)
    if (!phase) return real
    return real.filter((t) => t.format === phase)
  }, [tests, phase])

  async function handleDelete(test) {
    if (!(await confirm(`Удалить пробник «${test.title}»? Это действие нельзя отменить.`))) return
    try {
      await deleteTest(examKey, test.id)
      reload()
    } catch (err) {
      await alertMessage(err.message || 'Не удалось удалить пробник. Проверьте подключение к базе данных.')
    }
  }

  async function handleTogglePin(test) {
    const next = !test.isPinned
    // Optimistic — re-sort immediately rather than waiting on a reload,
    // since pin state is exactly what determines list order here.
    setTests((prev) =>
      prev
        .map((t) => (t.id === test.id ? { ...t, isPinned: next } : t))
        .sort((a, b) => Number(b.isPinned) - Number(a.isPinned))
    )
    try {
      await setPinned(test.id, next)
    } catch (err) {
      await alertMessage(err.message || 'Не удалось закрепить пробник.')
      reload()
    }
  }

  async function handleToggleAuth(test) {
    const next = !test.requiresAuth
    setTests((prev) => prev.map((t) => (t.id === test.id ? { ...t, requiresAuth: next } : t)))
    try {
      await setRequiresAuth(test.id, next)
    } catch (err) {
      await alertMessage(err.message || 'Не удалось изменить доступность пробника.')
      reload()
    }
  }

  const newTestLink = phase ? `/admin/${examKey}/new?format=${phase}` : `/admin/${examKey}/new`

  return (
    <div className="admin-page">
      <div className="admin-header">
        <div>
          <Link className="admin-back" to="/admin">← Все разделы</Link>
          <h1>{exam.label} — пробники</h1>
          <p>{exam.homeTitle}</p>
        </div>
        <div className="admin-header-actions">
          <Link className="btn btn-outline" to={`/admin/${examKey}/bank`}>Банк заданий</Link>
          <Link className="btn btn-outline" to={`/admin/${examKey}/parts`}>Части экзамена</Link>
          <Link className="btn btn-outline" to={`/admin/${examKey}/topics`}>Темы</Link>
          <Link className="btn btn-primary" to={newTestLink}>+ Добавить пробник</Link>
        </div>
      </div>

      {exam.phases && (
        <div className="phase-switch">
          {exam.phases.map((p) => (
            <button
              key={p.value}
              className={'phase-switch-btn' + (phase === p.value ? ' active' : '')}
              style={phase === p.value ? { background: exam.color } : undefined}
              onClick={() => setPhase(p.value)}
            >
              {p.label}
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <PageLoader />
      ) : visibleTests.length === 0 ? (
        <div className="tests-empty">
          {tests.length === 0
            ? 'Пока нет ни одного пробника. Нажмите «Добавить пробник», чтобы создать первый.'
            : 'В этой части пока нет пробников.'}
        </div>
      ) : (
        <div className="admin-table">
          <div className={'admin-table-row admin-table-head' + (exam.phases ? ' with-phase' : '')}>
            <span>Название</span>
            <span>Вопросов</span>
            <span>Минут</span>
            <span>Тип</span>
            <span>Тема</span>
            <span>Год</span>
            {exam.phases && <span>Часть</span>}
            <span />
          </div>
          {visibleTests.map((test) => {
            const topic = topics.find((t) => t.id === test.topic)
            const testPhase = exam.phases?.find((p) => p.value === test.format)
            return (
              <div className={'admin-table-row' + (exam.phases ? ' with-phase' : '')} key={test.id}>
                <span className="admin-table-title">
                  {test.title}
                  {test.isPinned && <span className="admin-pill pinned">Закреплён</span>}
                </span>
                <span>
                  {test.format === 'oral'
                    ? `${test.oralTask?.stages.length ?? 0} ${pluralizeRu(test.oralTask?.stages.length ?? 0, ['этап', 'этапа', 'этапов'])}`
                    : `${test.questionCount} ${pluralizeRu(test.questionCount, ['вопрос', 'вопроса', 'вопросов'])}`}
                </span>
                <span>{test.durationMinutes} мин</span>
                <span className={test.isOfficial ? 'admin-pill official' : 'admin-pill'}>
                  {test.isOfficial ? 'Официальный' : 'Неофициальный'}
                </span>
                <span>{topic ? topic.label : '—'}</span>
                <span>{test.year}</span>
                {exam.phases && <span>{testPhase ? testPhase.label : '—'}</span>}
                <span className="admin-table-actions">
                  <button
                    type="button"
                    className={'admin-pin-btn' + (test.isPinned ? ' active' : '')}
                    onClick={() => handleTogglePin(test)}
                    aria-label={test.isPinned ? 'Открепить пробник' : 'Закрепить пробник наверху списка'}
                    title={test.isPinned ? 'Открепить' : 'Закрепить наверху'}
                  >
                    {test.isPinned ? <IconPinFilled size={16} /> : <IconPin size={16} />}
                  </button>
                  <button
                    type="button"
                    className={'admin-pin-btn lock-btn' + (test.requiresAuth ? ' active' : '')}
                    onClick={() => handleToggleAuth(test)}
                    aria-label={test.requiresAuth ? 'Сделать доступным без входа' : 'Сделать доступным только авторизованным'}
                    title={test.requiresAuth ? 'Только для авторизованных — нажмите, чтобы открыть всем' : 'Доступен всем — нажмите, чтобы скрыть от неавторизованных'}
                  >
                    {test.requiresAuth ? <IconEyeOff size={16} /> : <IconEye size={16} />}
                  </button>
                  <Link className="btn btn-outline" to={`/admin/${examKey}/${test.id}`}>Редактировать</Link>
                  <button className="admin-delete-btn" onClick={() => handleDelete(test)} aria-label="Удалить">✕</button>
                </span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
