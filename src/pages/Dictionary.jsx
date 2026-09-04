import { useEffect, useState } from 'react'
import { useAuth } from '../contexts/AuthContext.jsx'
import { useDialog } from '../contexts/DialogContext.jsx'
import { listWords, deleteWord, wordsToAnkiText, downloadTextFile } from '../services/dictionaryService.js'
import AddWordModal from '../components/AddWordModal.jsx'
import { IconDownload, IconPlus, IconEdit, IconTrash, IconBook } from '../components/Icons.jsx'

const NO_CATEGORY = 'Без категории'

function groupByCategory(words) {
  const groups = new Map()
  for (const w of words) {
    const key = w.category || NO_CATEGORY
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key).push(w)
  }
  // "Без категории" last — named categories the person actually set up
  // are more useful to see first.
  return [...groups.entries()].sort((a, b) => {
    if (a[0] === NO_CATEGORY) return 1
    if (b[0] === NO_CATEGORY) return -1
    return a[0].localeCompare(b[0], 'ru')
  })
}

export default function Dictionary() {
  const { user } = useAuth()
  const { confirm, alertMessage } = useDialog()
  const [words, setWords] = useState([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingWord, setEditingWord] = useState(null)

  function reload() {
    if (!user) {
      setWords([])
      setLoading(false)
      return
    }
    setLoading(true)
    listWords(user.id).then((list) => {
      setWords(list)
      setLoading(false)
    })
  }

  useEffect(reload, [user])

  async function handleDelete(word) {
    if (!(await confirm(`Удалить «${word.word}» из словаря?`))) return
    try {
      await deleteWord(word.id)
      setWords((prev) => prev.filter((w) => w.id !== word.id))
    } catch (err) {
      await alertMessage(err.message || 'Не удалось удалить слово.')
    }
  }

  function handleExport() {
    downloadTextFile('ep-wonna-slovar.txt', wordsToAnkiText(words))
  }

  const groups = groupByCategory(words)

  return (
    <div className="mylearning-page">
      <div className="admin-header">
        <div>
          <h1>Словарь</h1>
          <p>Слова, которые ты сохранил во время подготовки</p>
        </div>
        {user && (
          <div className="dict-header-actions">
            <button type="button" className="btn btn-outline" onClick={handleExport} disabled={words.length === 0}>
              <IconDownload size={16} /> Для Anki / Quizlet
            </button>
            <button type="button" className="btn btn-primary" onClick={() => { setEditingWord(null); setModalOpen(true) }}>
              <IconPlus size={16} /> Добавить слово
            </button>
          </div>
        )}
      </div>

      {!user ? (
        <p className="admin-note">Войдите, чтобы вести свой словарь.</p>
      ) : loading ? (
        <p className="admin-note">Загрузка…</p>
      ) : words.length === 0 ? (
        <div className="dict-empty">
          <IconBook size={28} />
          <p>Пока здесь пусто. Добавьте слово вручную или выделите его в любом тексте на сайте — появится подсказка «Добавить в словарь».</p>
          <button type="button" className="btn btn-primary" onClick={() => { setEditingWord(null); setModalOpen(true) }}>
            <IconPlus size={16} /> Добавить первое слово
          </button>
        </div>
      ) : (
        groups.map(([category, items]) => (
          <div key={category}>
            <div className="dict-category-label">{category.toUpperCase()}</div>
            <div className="dict-word-list">
              {items.map((w) => (
                <div className="dict-word-card" key={w.id}>
                  <div>
                    <div className="dict-word-term">{w.word}</div>
                    {w.translation && <div className="dict-word-translation">{w.translation}</div>}
                    {w.example && <div className="dict-word-example">«{w.example}»</div>}
                  </div>
                  <div className="dict-word-actions">
                    <button type="button" onClick={() => { setEditingWord(w); setModalOpen(true) }} aria-label="Изменить">
                      <IconEdit size={16} />
                    </button>
                    <button type="button" onClick={() => handleDelete(w)} aria-label="Удалить">
                      <IconTrash size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))
      )}

      {modalOpen && (
        <AddWordModal
          userId={user?.id}
          wordToEdit={editingWord}
          onClose={() => setModalOpen(false)}
          onSaved={reload}
        />
      )}
    </div>
  )
}
