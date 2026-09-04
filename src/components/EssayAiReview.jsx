// Отображает результат AI-проверки сочинения (см. essayAiService.js).
// Не занимается запуском проверки само — только рендерит `review`,
// либо кнопку «Проверить с ИИ», если проверки ещё нет.

import { useState } from 'react'

export default function EssayAiReview({ review, onCheck, checking, error, showButton = true, usage }) {
  const [expanded, setExpanded] = useState(false)

  const usageLine = usage ? (
    <p className="essay-ai-usage">
      Проверок сегодня: {usage.used} из {usage.limit}
    </p>
  ) : null

  if (!review) {
    if (!showButton) {
      // Ничего проверять пока нечего, а свою кнопку эта копия не
      // показывает (кнопка уже есть снаружи, например рядом с
      // «Ответить» в TestPage.jsx) — рендерить тут вообще нечего.
      return error ? <p className="essay-ai-error">{error}</p> : null
    }
    return (
      <div className="essay-ai-review essay-ai-review-empty">
        <button type="button" className="btn btn-outline" onClick={onCheck} disabled={checking}>
          {checking ? 'Проверяем…' : '✨ Проверить с ИИ'}
        </button>
        {usageLine}
        {error && <p className="essay-ai-error">{error}</p>}
        <p className="essay-ai-disclaimer">
          Проверка выполняется нейросетью (Gemini) и может ошибаться — воспринимайте как черновой ориентир, а не
          официальную оценку.
        </p>
      </div>
    )
  }

  const { feedback } = review

  return (
    <div className="essay-ai-review">
      <div className="essay-ai-review-head">
        <div className="essay-ai-overall">
          <span className="essay-ai-band">{feedback?.overall?.band}</span>
          <span className="essay-ai-overall-comment">{feedback?.overall?.comment}</span>
        </div>
        {showButton && (
          <div className="essay-ai-recheck">
            <button type="button" className="btn btn-outline btn-sm" onClick={onCheck} disabled={checking}>
              {checking ? 'Проверяем…' : 'Проверить заново'}
            </button>
            {usageLine}
          </div>
        )}
      </div>

      {error && <p className="essay-ai-error">{error}</p>}

      <button type="button" className="essay-ai-toggle" onClick={() => setExpanded((e) => !e)}>
        {expanded ? 'Скрыть подробности' : 'Показать подробности по критериям'}
      </button>

      {expanded && (
        <div className="essay-ai-details">
          {feedback?.criteria?.length > 0 && (
            <div className="essay-ai-criteria">
              {feedback.criteria.map((c, i) => (
                <div className="essay-ai-criterion" key={i}>
                  <div className="essay-ai-criterion-head">
                    <span className="essay-ai-criterion-name">{c.name}</span>
                    <span className="essay-ai-criterion-band">{c.band}</span>
                  </div>
                  <p className="essay-ai-criterion-comment">{c.comment}</p>
                </div>
              ))}
            </div>
          )}

          {feedback?.strengths?.length > 0 && (
            <div className="essay-ai-list-block">
              <h5>Сильные стороны</h5>
              <ul>
                {feedback.strengths.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ul>
            </div>
          )}

          {feedback?.improvements?.length > 0 && (
            <div className="essay-ai-list-block">
              <h5>Что можно улучшить</h5>
              <ul>
                {feedback.improvements.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      <p className="essay-ai-disclaimer">Оценка выполнена нейросетью (Gemini) и может ошибаться.</p>
    </div>
  )
}
