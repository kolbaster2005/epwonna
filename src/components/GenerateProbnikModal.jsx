import { useState } from 'react'
import { generateProbnik } from '../services/generationService.js'

export default function GenerateProbnikModal({ examKey, userId, topics, onClose, onGenerated }) {
  const [genTopics, setGenTopics] = useState([])
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState(null) // { testId, warnings }

  function toggleTopic(topicId) {
    setGenTopics((prev) => {
      if (prev.includes(topicId)) return prev.filter((t) => t !== topicId)
      if (prev.length >= 3) return prev // максимум 3 темы за раз
      return [...prev, topicId]
    })
  }

  async function handleGenerate() {
    setGenerating(true)
    setError('')
    try {
      const { testId, warnings } = await generateProbnik({ examKey, userId, topicIds: genTopics })
      if (warnings.length > 0) {
        setResult({ testId, warnings })
      } else {
        onGenerated(testId)
      }
    } catch (err) {
      setError(err.message || 'Не удалось сгенерировать пробник. Попробуйте ещё раз.')
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal generate-modal">
        <button type="button" className="modal-close" onClick={onClose} aria-label="Закрыть">✕</button>

        {result ? (
          <>
            <h3>Пробник собран — но с оговорками</h3>
            <div className="generate-modal-warnings">
              {result.warnings.map((w, i) => (
                <p key={i}>{w}</p>
              ))}
            </div>
            <button type="button" className="btn btn-primary" onClick={() => onGenerated(result.testId)}>
              Перейти к пробнику
            </button>
          </>
        ) : (
          <>
            <h3>🎲 Сгенерировать пробник</h3>
            <p className="admin-note">
              Соберём пробник из банка заданий: 2 на чтение, 2 на грамматику, 1 на письмо. По возможности —
              задания, которые вы ещё не решали. Можно выбрать до 3 тем — тогда постараемся взять задания именно
              по ним.
            </p>

            {topics.length > 0 && (
              <div className="generate-modal-topics">
                {topics.map((t) => {
                  const checked = genTopics.includes(t.id)
                  return (
                    <label className={'generate-modal-topic' + (checked ? ' checked' : '')} key={t.id}>
                      <input
                        type="checkbox"
                        checked={checked}
                        disabled={!checked && genTopics.length >= 3}
                        onChange={() => toggleTopic(t.id)}
                      />
                      {t.label}
                    </label>
                  )
                })}
              </div>
            )}

            {error && <p className="word-modal-error">{error}</p>}

            <button type="button" className="btn btn-primary" onClick={handleGenerate} disabled={generating}>
              {generating ? 'Собираю…' : 'Сгенерировать'}
            </button>
          </>
        )}
      </div>
    </div>
  )
}
