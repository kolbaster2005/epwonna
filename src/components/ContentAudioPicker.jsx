import { useState } from 'react'
import { createContent, uploadListeningAudio } from '../services/contentService.js'

// Lets an admin attach a question to a reusable content row (shared
// text and/or audio from the task bank — question.content_id) — either
// picking one that already exists, or creating a new one right here by
// typing a title and choosing an audio file. The file goes straight to
// Supabase Storage; only the resulting public URL is stored on the
// content row, so nothing binary ever touches the questions table.
export default function ContentAudioPicker({ examKey, value, options, onChange, onCreated }) {
  const [creating, setCreating] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [file, setFile] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')

  async function handleCreate(e) {
    e.preventDefault()
    if (!newTitle.trim()) {
      setError('Введите название — например заголовок задания.')
      return
    }
    setUploading(true)
    setError('')
    try {
      let audioUrl
      if (file) {
        audioUrl = await uploadListeningAudio(file)
      }
      const row = await createContent({ examKey, title: newTitle.trim(), category: 'Аудирование', audioUrl })
      onCreated(row)
      onChange(row.id)
      setCreating(false)
      setNewTitle('')
      setFile(null)
    } catch (err) {
      setError(err.message || 'Не удалось создать и загрузить.')
    } finally {
      setUploading(false)
    }
  }

  if (creating) {
    return (
      <div className="admin-content-picker admin-content-picker-form">
        <label className="admin-field">
          <span>Название <em>(заголовок задания, например «Hörtext 4: ...»)</em></span>
          <input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="Hörtext 4: ..." />
        </label>
        <label className="admin-field">
          <span>Аудиофайл <em>(необязательно — можно добавить позже)</em></span>
          <input type="file" accept="audio/*" onChange={(e) => setFile(e.target.files?.[0] || null)} />
        </label>
        {error && <p className="word-modal-error">{error}</p>}
        <div className="admin-content-picker-actions">
          <button type="button" className="btn btn-outline btn-sm" onClick={() => setCreating(false)} disabled={uploading}>
            Отмена
          </button>
          <button type="button" className="btn btn-primary btn-sm" onClick={handleCreate} disabled={uploading}>
            {uploading ? 'Загружаем…' : 'Создать и прикрепить'}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="admin-content-picker">
      <select value={value || ''} onChange={(e) => onChange(e.target.value || undefined)}>
        <option value="">Без аудио/переиспользуемого текста</option>
        {options.map((c) => (
          <option key={c.id} value={c.id}>
            {c.title || '(без названия)'}
            {c.audio_url ? ' 🎧' : ''}
          </option>
        ))}
      </select>
      <button type="button" className="btn btn-outline btn-sm" onClick={() => setCreating(true)}>
        + Новое аудио
      </button>
    </div>
  )
}
