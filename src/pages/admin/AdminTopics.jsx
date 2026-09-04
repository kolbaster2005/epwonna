import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { exams } from '../../data/examData.js'
import { listTopics, createTopic, updateTopic, deleteTopic } from '../../services/topicsService.js'
import { IconPlus, IconTrash } from '../../components/Icons.jsx'
import { useDialog } from '../../contexts/DialogContext.jsx'

// Same slugification the person would otherwise have to do by hand —
// "Тема" -> "tema", so the id stays a clean identifier even though the
// admin only ever types the Russian label.
function slugify(label) {
  const translit = {
    а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'e', ж: 'zh', з: 'z', и: 'i',
    й: 'i', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't',
    у: 'u', ф: 'f', х: 'h', ц: 'ts', ч: 'ch', ш: 'sh', щ: 'sch', ъ: '', ы: 'y', ь: '',
    э: 'e', ю: 'yu', я: 'ya',
  }
  return label
    .toLowerCase()
    .split('')
    .map((ch) => translit[ch] ?? ch)
    .join('')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40)
}

export default function AdminTopics({ examKey }) {
  const exam = exams[examKey]
  const { confirm, alertMessage } = useDialog()
  const [topics, setTopics] = useState([])
  const [loading, setLoading] = useState(true)
  const [newLabel, setNewLabel] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  function reload() {
    setLoading(true)
    listTopics(examKey).then((list) => {
      setTopics(list)
      setLoading(false)
    })
  }

  useEffect(reload, [examKey])

  async function handleAdd(e) {
    e.preventDefault()
    const label = newLabel.trim()
    if (!label) return
    const id = slugify(label) || `topic-${Date.now()}`
    if (topics.some((t) => t.id === id)) {
      setError('Тема с похожим названием уже есть.')
      return
    }
    setSaving(true)
    setError('')
    try {
      const sortOrder = topics.length ? Math.max(...topics.map((t) => t.sortOrder)) + 1 : 1
      await createTopic({ examKey, id, label, sortOrder })
      setNewLabel('')
      reload()
    } catch (err) {
      setError(err.message || 'Не удалось добавить тему.')
    } finally {
      setSaving(false)
    }
  }

  async function handleRename(topic, label) {
    if (!label.trim() || label === topic.label) return
    try {
      await updateTopic(examKey, topic.id, { label: label.trim() })
      reload()
    } catch (err) {
      await alertMessage(err.message || 'Не удалось переименовать тему.')
    }
  }

  async function handleDelete(topic) {
    if (!(await confirm(`Удалить тему «${topic.label}»? Пробники, у которых она уже выбрана, не удалятся, но тема пропадёт из выпадающего списка.`))) return
    try {
      await deleteTopic(examKey, topic.id)
      reload()
    } catch (err) {
      await alertMessage(err.message || 'Не удалось удалить тему.')
    }
  }

  async function move(topic, direction) {
    const idx = topics.findIndex((t) => t.id === topic.id)
    const swapIdx = idx + direction
    if (swapIdx < 0 || swapIdx >= topics.length) return
    const other = topics[swapIdx]
    try {
      await Promise.all([
        updateTopic(examKey, topic.id, { sortOrder: other.sortOrder }),
        updateTopic(examKey, other.id, { sortOrder: topic.sortOrder }),
      ])
      reload()
    } catch (err) {
      await alertMessage(err.message || 'Не удалось изменить порядок.')
    }
  }

  return (
    <div className="admin-page">
      <div className="admin-header">
        <div>
          <h1>Темы — {exam.label}</h1>
          <p>Список тем, из которого выбирают при создании пробника, и по которому фильтруют на странице «{exam.label}».</p>
        </div>
        <Link className="btn btn-outline" to={`/admin/${examKey}`}>← К пробникам {exam.label}</Link>
      </div>

      {loading ? (
        <p className="admin-note">Загрузка…</p>
      ) : (
        <>
          {topics.length === 0 ? (
            <p className="admin-note">Тем пока нет — добавьте первую ниже.</p>
          ) : (
            <div className="admin-topics-list">
              {topics.map((topic, i) => (
                <div className="admin-topics-row" key={topic.id}>
                  <div className="admin-topics-reorder">
                    <button type="button" disabled={i === 0} onClick={() => move(topic, -1)} aria-label="Выше">▲</button>
                    <button type="button" disabled={i === topics.length - 1} onClick={() => move(topic, 1)} aria-label="Ниже">▼</button>
                  </div>
                  <input
                    className="admin-topics-label-input"
                    defaultValue={topic.label}
                    onBlur={(e) => handleRename(topic, e.target.value)}
                  />
                  <span className="admin-topics-id">{topic.id}</span>
                  <button type="button" className="admin-delete-btn" onClick={() => handleDelete(topic)} aria-label="Удалить">
                    <IconTrash size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}

          <form className="admin-topics-add" onSubmit={handleAdd}>
            <input
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              placeholder="Название новой темы, например «Финансы»"
            />
            <button type="submit" className="btn btn-primary" disabled={saving || !newLabel.trim()}>
              <IconPlus size={16} /> Добавить тему
            </button>
          </form>
          {error && <p className="word-modal-error">{error}</p>}
        </>
      )}
    </div>
  )
}
