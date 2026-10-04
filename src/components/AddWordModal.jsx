import { useState } from 'react'
import { IconTranslate } from './Icons.jsx'
import { translateText, addWord, updateWord } from '../services/dictionaryService.js'
import ModalOverlay from './ModalOverlay.jsx'

export default function AddWordModal({ userId, initialWord = '', wordToEdit = null, onClose, onSaved }) {
  const [word, setWord] = useState(wordToEdit?.word ?? initialWord)
  const [translation, setTranslation] = useState(wordToEdit?.translation ?? '')
  const [example, setExample] = useState(wordToEdit?.example ?? '')
  const [category, setCategory] = useState(wordToEdit?.category ?? '')
  const [translating, setTranslating] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const isEditing = !!wordToEdit

  async function handleTranslate() {
    if (!word.trim()) return
    setTranslating(true)
    setError('')
    try {
      const result = await translateText(word)
      setTranslation(result)
    } catch (err) {
      setError('Не удалось перевести автоматически — впишите перевод вручную.')
    } finally {
      setTranslating(false)
    }
  }

  async function handleSave() {
    if (!word.trim()) {
      setError('Впишите слово.')
      return
    }
    setSaving(true)
    setError('')
    try {
      if (isEditing) {
        await updateWord(wordToEdit.id, { word, translation, example, category })
      } else {
        await addWord({ userId, word, translation, example, category })
      }
      onSaved?.()
      onClose()
    } catch (err) {
      setError(err.message || 'Не удалось сохранить слово.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <ModalOverlay onClose={onClose}>
      <div className="modal word-modal">
        <button className="modal-close" onClick={onClose} aria-label="Закрыть">✕</button>

        <h2>{isEditing ? 'Изменить слово' : 'Добавить слово'}</h2>

        <label className="admin-field">
          <span>Слово</span>
          <div className="word-modal-row">
            <input value={word} onChange={(e) => setWord(e.target.value)} placeholder="GmbH" autoFocus />
            <button type="button" className="btn btn-outline" onClick={handleTranslate} disabled={translating || !word.trim()}>
              <IconTranslate size={16} /> {translating ? 'Перевожу…' : 'Перевести'}
            </button>
          </div>
        </label>

        <label className="admin-field">
          <span>Перевод</span>
          <input
            value={translation}
            onChange={(e) => setTranslation(e.target.value)}
            placeholder="можно вписать вручную или получить кнопкой выше"
          />
        </label>

        <label className="admin-field">
          <span>Пример (необязательно, один)</span>
          <textarea
            rows={3}
            value={example}
            onChange={(e) => setExample(e.target.value)}
            placeholder="Пример использования слова"
          />
        </label>

        <label className="admin-field">
          <span>Категория (необязательно)</span>
          <input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="например, Экономика" />
        </label>

        {error && <p className="word-modal-error">{error}</p>}

        <div className="modal-actions">
          <button type="button" className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Сохраняю…' : 'Сохранить'}
          </button>
          <button type="button" className="btn btn-outline" onClick={onClose}>
            Отмена
          </button>
        </div>
      </div>
    </ModalOverlay>
  )
}
