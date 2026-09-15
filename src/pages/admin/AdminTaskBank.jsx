import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { exams } from '../../data/examData.js'
import { listAllQuestionsForBank, ensureTaskBankTest } from '../../services/testsService.js'
import { listExamParts } from '../../services/examPartsService.js'
import { listTopics } from '../../services/topicsService.js'
import PageLoader from '../../components/PageLoader.jsx'

const TYPE_LABEL = {
  multiple_choice: 'Варианты ответа',
  numeric: 'Числовой ответ',
  true_false: 'Верно/неверно',
  heading_match: 'Подбор заголовков',
  short_answer: 'Короткий ответ',
  cloze: 'Текст с пропусками',
  qa_table: 'Таблица вопрос-ответ',
  tf_table: 'Верно/неверно + доказательство',
  essay_choice: 'Сочинение (выбор темы)',
  free_text: 'Свободный текст',
  multi_part: 'Составной вопрос',
}

export default function AdminTaskBank({ examKey }) {
  const exam = exams[examKey]
  const [loading, setLoading] = useState(true)
  const [tasks, setTasks] = useState([])
  const [examParts, setExamParts] = useState([])
  const [topics, setTopics] = useState([])
  const [bankTestId, setBankTestId] = useState(null)

  const [filterPart, setFilterPart] = useState('')
  const [filterType, setFilterType] = useState('')
  const [filterTaskType, setFilterTaskType] = useState('')
  const [filterTopic, setFilterTopic] = useState('')
  const [search, setSearch] = useState('')

  function reload() {
    setLoading(true)
    Promise.all([
      listAllQuestionsForBank(examKey),
      listExamParts(examKey),
      listTopics(examKey),
      ensureTaskBankTest(examKey),
    ]).then(([taskList, partList, topicList, bankTest]) => {
      setTasks(taskList)
      setExamParts(partList)
      setTopics(topicList)
      setBankTestId(bankTest?.id ?? null)
      setLoading(false)
    })
  }

  useEffect(reload, [examKey])

  const taskTypeOptions = useMemo(
    () => [...new Set(tasks.map((t) => t.taskType).filter(Boolean))].sort(),
    [tasks]
  )
  const topicLabelById = useMemo(() => Object.fromEntries(topics.map((t) => [t.id, t.label])), [topics])

  const filtered = tasks.filter((t) => {
    if (filterPart && t.category !== filterPart) return false
    if (filterType && t.type !== filterType) return false
    if (filterTaskType && t.taskType !== filterTaskType) return false
    if (filterTopic && !(t.topicIds || []).includes(filterTopic)) return false
    if (search.trim() && !t.text?.toLowerCase().includes(search.trim().toLowerCase())) return false
    return true
  })

  return (
    <div className="admin-page">
      <div className="admin-header">
        <div>
          <h1>Банк заданий — {exam.label}</h1>
          <p>Все задания этого экзамена, независимо от того, в каком пробнике они лежат — с фильтрами.</p>
        </div>
        <div className="admin-header-actions">
          <Link className="btn btn-outline" to={`/admin/${examKey}`}>← К пробникам {exam.label}</Link>
          {bankTestId && (
            <Link className="btn btn-primary" to={`/admin/${examKey}/${bankTestId}`}>
              + Добавить задание в банк
            </Link>
          )}
        </div>
      </div>

      <p className="admin-note">
        Кнопка «+ Добавить задание в банк» открывает служебный пробник «Банк заданий» — он никогда не показывается
        ученикам и не считается в статистике прохождений. Добавляйте вопросы туда тем же редактором, что и в обычном
        пробнике — они сразу появятся в списке ниже. Если задание уже принадлежит настоящему пробнику, редактировать
        его нужно прямо в этом пробнике — ссылка «Редактировать» у каждой строки ведёт туда.
      </p>

      {loading ? (
        <PageLoader />
      ) : (
        <>
          <div className="admin-bank-filters">
            <select value={filterPart} onChange={(e) => setFilterPart(e.target.value)}>
              <option value="">Все части экзамена</option>
              {examParts.map((p) => (
                <option key={p.id} value={p.label}>{p.label}</option>
              ))}
            </select>

            <select value={filterType} onChange={(e) => setFilterType(e.target.value)}>
              <option value="">Все типы ответа</option>
              {Object.entries(TYPE_LABEL).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>

            {taskTypeOptions.length > 0 && (
              <select value={filterTaskType} onChange={(e) => setFilterTaskType(e.target.value)}>
                <option value="">Все типы задания</option>
                {taskTypeOptions.map((tt) => (
                  <option key={tt} value={tt}>{tt}</option>
                ))}
              </select>
            )}

            {topics.length > 0 && (
              <select value={filterTopic} onChange={(e) => setFilterTopic(e.target.value)}>
                <option value="">Все темы</option>
                {topics.map((t) => (
                  <option key={t.id} value={t.id}>{t.label}</option>
                ))}
              </select>
            )}

            <input
              className="admin-bank-search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Поиск по тексту вопроса…"
            />
          </div>

          <p className="admin-note">
            Найдено: {filtered.length} из {tasks.length}
          </p>

          {filtered.length === 0 ? (
            <p className="admin-note">Ничего не найдено — попробуйте изменить фильтры, или пока заданий вообще нет.</p>
          ) : (
            <div className="admin-bank-list">
              {filtered.map((t) => (
                <div className="admin-bank-row" key={t.id}>
                  <div className="admin-bank-row-main">
                    <span className="admin-pill">{TYPE_LABEL[t.type] || t.type}</span>
                    {t.category && <span className="admin-pill">{t.category}</span>}
                    {t.taskType && <span className="admin-pill">{t.taskType}</span>}
                    {(t.topicIds || []).map((tid) => (
                      <span className="admin-pill topic" key={tid}>{topicLabelById[tid] || tid}</span>
                    ))}
                    <span className="admin-bank-text">{t.text || '(без текста)'}</span>
                  </div>
                  <div className="admin-bank-row-meta">
                    <span className="admin-bank-test-badge">
                      {t.isTaskBankTest ? 'Банк — без пробника' : t.testTitle}
                    </span>
                    <Link className="btn btn-outline" to={`/admin/${examKey}/${t.testId}`}>Редактировать →</Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
