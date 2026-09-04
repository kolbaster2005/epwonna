import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { exams } from '../../data/examData.js'
import { listExamParts, createExamPart, updateExamPart, deleteExamPart } from '../../services/examPartsService.js'
import { IconPlus, IconTrash } from '../../components/Icons.jsx'
import { useDialog } from '../../contexts/DialogContext.jsx'

// Same slugification as AdminTopics.jsx.
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

export default function AdminExamParts({ examKey }) {
  const exam = exams[examKey]
  const { confirm, alertMessage } = useDialog()
  const [parts, setParts] = useState([])
  const [loading, setLoading] = useState(true)
  const [newLabel, setNewLabel] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  function reload() {
    setLoading(true)
    listExamParts(examKey).then((list) => {
      setParts(list)
      setLoading(false)
    })
  }

  useEffect(reload, [examKey])

  async function handleAdd(e) {
    e.preventDefault()
    const label = newLabel.trim()
    if (!label) return
    const id = slugify(label) || `part-${Date.now()}`
    if (parts.some((p) => p.id === id)) {
      setError('Часть с похожим названием уже есть.')
      return
    }
    setSaving(true)
    setError('')
    try {
      const sortOrder = parts.length ? Math.max(...parts.map((p) => p.sortOrder)) + 1 : 1
      await createExamPart({ examKey, id, label, sortOrder })
      setNewLabel('')
      reload()
    } catch (err) {
      setError(err.message || 'Не удалось добавить часть.')
    } finally {
      setSaving(false)
    }
  }

  async function handleRename(part, label) {
    if (!label.trim() || label === part.label) return
    try {
      await updateExamPart(examKey, part.id, { label: label.trim() })
      reload()
    } catch (err) {
      await alertMessage(err.message || 'Не удалось переименовать часть.')
    }
  }

  async function handleDelete(part) {
    if (!(await confirm(`Удалить часть «${part.label}»? У вопросов, где она уже стояла, ничего не удалится — просто пропадёт из выпадающего списка.`))) return
    try {
      await deleteExamPart(examKey, part.id)
      reload()
    } catch (err) {
      await alertMessage(err.message || 'Не удалось удалить часть.')
    }
  }

  async function move(part, direction) {
    const idx = parts.findIndex((p) => p.id === part.id)
    const swapIdx = idx + direction
    if (swapIdx < 0 || swapIdx >= parts.length) return
    const other = parts[swapIdx]
    try {
      await Promise.all([
        updateExamPart(examKey, part.id, { sortOrder: other.sortOrder }),
        updateExamPart(examKey, other.id, { sortOrder: part.sortOrder }),
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
          <h1>Части экзамена — {exam.label}</h1>
          <p>
            Разделы (Leseverstehen, Grammatik...), по которым группируются вопросы внутри пробника и по которым
            в будущем можно будет фильтровать банк заданий.
          </p>
        </div>
        <Link className="btn btn-outline" to={`/admin/${examKey}`}>← К пробникам {exam.label}</Link>
      </div>

      {loading ? (
        <p className="admin-note">Загрузка…</p>
      ) : (
        <>
          {parts.length === 0 ? (
            <p className="admin-note">Частей пока нет — добавьте первую ниже.</p>
          ) : (
            <div className="admin-topics-list">
              {parts.map((part, i) => (
                <div className="admin-topics-row" key={part.id}>
                  <div className="admin-topics-reorder">
                    <button type="button" disabled={i === 0} onClick={() => move(part, -1)} aria-label="Выше">▲</button>
                    <button type="button" disabled={i === parts.length - 1} onClick={() => move(part, 1)} aria-label="Ниже">▼</button>
                  </div>
                  <input
                    className="admin-topics-label-input"
                    defaultValue={part.label}
                    onBlur={(e) => handleRename(part, e.target.value)}
                  />
                  <span className="admin-topics-id">{part.id}</span>
                  <button type="button" className="admin-delete-btn" onClick={() => handleDelete(part)} aria-label="Удалить">
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
              placeholder="Название новой части, например «Hörverstehen»"
            />
            <button type="submit" className="btn btn-primary" disabled={saving || !newLabel.trim()}>
              <IconPlus size={16} /> Добавить часть
            </button>
          </form>
          {error && <p className="word-modal-error">{error}</p>}
        </>
      )}
    </div>
  )
}
