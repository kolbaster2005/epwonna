import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext.jsx'
import { translateText } from '../services/dictionaryService.js'
import { IconTranslate, IconBookmarkPlus, IconHighlighter } from './Icons.jsx'
import AddWordModal from './AddWordModal.jsx'

// Only on the actual test-taking pages (written /test/... and oral
// /oral/...) — not on the exam listing, test-detail intro, or anywhere
// else on the site. Matches both /epm/test/:id and /epd/oral/:id.
const TEST_PAGE_PATTERN = /\/(test|oral)\//

export default function SelectionPopup() {
  const { user } = useAuth()
  const location = useLocation()
  const isTestPage = TEST_PAGE_PATTERN.test(location.pathname)
  const [selection, setSelection] = useState(null) // { text, range, x, y }
  const [translation, setTranslation] = useState(null)
  const [translating, setTranslating] = useState(false)
  const [modalWord, setModalWord] = useState(null) // string|null — opens AddWordModal when set

  // Leaving a test page (or landing on one) — drop any leftover popup
  // state rather than carrying it across, e.g. a stale selection
  // flashing on the next test page visited.
  useEffect(() => {
    setSelection(null)
    setTranslation(null)
    setModalWord(null)
  }, [isTestPage])

  useEffect(() => {
    if (!isTestPage) return undefined

    function handleMouseUp(e) {
      // Ignore clicks landing inside the popup itself or the modal —
      // those are handled by their own onClick handlers, not by
      // recomputing the selection here.
      if (e.target.closest?.('.selection-popup') || e.target.closest?.('.modal-overlay')) return

      const sel = window.getSelection()
      const text = sel && sel.rangeCount > 0 ? sel.toString().trim() : ''
      if (!text) {
        setSelection(null)
        setTranslation(null)
        return
      }
      const range = sel.getRangeAt(0)
      const rect = range.getBoundingClientRect()
      setSelection({ text, range, x: rect.left + rect.width / 2, y: rect.top })
      setTranslation(null)
    }

    document.addEventListener('mouseup', handleMouseUp)
    return () => document.removeEventListener('mouseup', handleMouseUp)
  }, [isTestPage])

  function closePopup() {
    setSelection(null)
    setTranslation(null)
  }

  async function handleTranslate() {
    if (!selection) return
    setTranslating(true)
    try {
      const result = await translateText(selection.text)
      setTranslation(result)
    } catch {
      setTranslation('Не удалось перевести. Попробуйте ещё раз.')
    } finally {
      setTranslating(false)
    }
  }

  function handleAddToDictionary() {
    setModalWord(selection.text)
    window.getSelection()?.removeAllRanges()
    closePopup()
  }

  function handleHighlight() {
    if (selection?.range) {
      try {
        const mark = document.createElement('mark')
        mark.className = 'selection-highlight'
        selection.range.surroundContents(mark)
      } catch {
        // The selection crosses a partial element boundary (e.g. spans
        // two different paragraphs) — Range.surroundContents can't wrap
        // that safely. Silently skip rather than corrupting the DOM.
      }
    }
    window.getSelection()?.removeAllRanges()
    closePopup()
  }

  if (!isTestPage) return null

  return (
    <>
      {selection &&
        createPortal(
          <div
            className="selection-popup"
            style={{ left: selection.x, top: selection.y }}
            onMouseDown={(e) => e.preventDefault()}
          >
            <div className="selection-popup-actions">
              <button type="button" onClick={handleTranslate} disabled={translating}>
                <IconTranslate size={15} /> {translating ? 'Перевожу…' : 'Перевести'}
              </button>
              {user && (
                <button type="button" onClick={handleAddToDictionary}>
                  <IconBookmarkPlus size={15} /> Добавить в словарь
                </button>
              )}
              <button type="button" className="selection-popup-highlight" onClick={handleHighlight}>
                <IconHighlighter size={15} /> Выделить
              </button>
            </div>
            {translation && <div className="selection-popup-result">{translation}</div>}
          </div>,
          document.body
        )}

      {modalWord !== null && user && (
        <AddWordModal userId={user.id} initialWord={modalWord} onClose={() => setModalWord(null)} />
      )}
    </>
  )
}
