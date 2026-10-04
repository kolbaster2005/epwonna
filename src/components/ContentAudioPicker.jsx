import { useEffect, useState } from 'react'
import { createContent, updateContent, uploadListeningAudio } from '../services/contentService.js'

// Lets an admin attach a question to a reusable content row (shared
// text and/or audio from the task bank — question.content_id) — either
// picking one that already exists, or creating a new one right here by
// typing a title and choosing an audio file. The file goes straight to
// Supabase Storage; only the resulting public URL is stored on the
// content row, so nothing binary ever touches the questions table.
//
// Also doubles as the editor for that row's транскрипция (transcript) —
// shown to students via a button next to the audio player, but only PRO
// actually gets to open it (see TestPage.jsx / TranscriptModal.jsx).
export default function ContentAudioPicker({ examKey, value, options, onChange, onCreated }) {
  const [creating, setCreating] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newTranscript, setNewTranscript] = useState('')
  const [file, setFile] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')

  const selected = options.find((c) => c.id === value)
  const [transcriptDraft, setTranscriptDraft] = useState(selected?.transcript || '')
  const [savingTranscript, setSavingTranscript] = useState(false)
  const [transcriptSaved, setTranscriptSaved] = useState(false)

  // Подтягиваем черновик транскрипции заново при смене выбранной записи
  // (переключились на другое аудио, или только что создали новое).
  useEffect(() => {
    setTranscriptDraft(selected?.transcript || '')
    setTranscriptSaved(false)
  }, [selected?.id]) // eslint-disable-line react-hooks/exhaustive-deps

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
      const row = await createContent({
        examKey,
        title: newTitle.trim(),
        category: 'Аудирование',
        audioUrl,
        transcript: newTranscript.trim() || undefined,
      })
      onCreated(row)
      onChange(row.id)
      setCreating(false)
      setNewTitle('')
      setNewTranscript('')
      setFile(null)
    } catch (err) {
      setError(err.message || 'Не удалось создать и загрузить.')
    } finally {
      setUploading(false)
    }
  }

  async function handleSaveTranscript() {
    if (!selected) return
    setSavingTranscript(true)
    setTranscriptSaved(false)
    try {
      const row = await updateContent({ id: selected.id, transcript: transcriptDraft.trim() })
      onCreated(row)
      setTranscriptSaved(true)
    } catch (err) {
      setError(err.message || 'Не удалось сохранить транскрипцию.')
    } finally {
      setSavingTranscript(false)
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
        <label className="admin-field">
          <span>
            Транскрипция <em>(необязательно — кнопка у студента появится только если она заполнена; доступна только PRO)</em>
          </span>
          <textarea
            className="admin-content-transcript-textarea"
            rows={5}
            value={newTranscript}
            onChange={(e) => setNewTranscript(e.target.value)}
            placeholder="Полный текст аудио…"
          />
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
      <div className="admin-content-picker-row">
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

      {selected && (
        <div className="admin-content-transcript">
          <label className="admin-field">
            <span>
              Транскрипция для «{selected.title || '(без названия)'}»{' '}
              <em>(кнопка у студента появится только если заполнено; доступна только PRO)</em>
            </span>
            <textarea
              className="admin-content-transcript-textarea"
              rows={5}
              value={transcriptDraft}
              onChange={(e) => {
                setTranscriptDraft(e.target.value)
                setTranscriptSaved(false)
              }}
              placeholder="Полный текст аудио…"
            />
          </label>
          {error && <p className="word-modal-error">{error}</p>}
          <div className="admin-content-picker-actions">
            {transcriptSaved && <span className="admin-content-transcript-saved">Сохранено</span>}
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={handleSaveTranscript}
              disabled={savingTranscript || transcriptDraft === (selected.transcript || '')}
            >
              {savingTranscript ? 'Сохраняем…' : 'Сохранить транскрипцию'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
