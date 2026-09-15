// Отображает результат AI-проверки сочинения (см. essayAiService.js).
// Не занимается запуском проверки само — только рендерит `review`,
// либо кнопку «Проверить с ИИ», если проверки ещё нет. Ошибки
// валидации/сети показываются снаружи, в общем блоке под рядом кнопок
// в TestPage.jsx — не здесь.

import { useState } from 'react'

export default function EssayAiReview({ review, onCheck, checking, showButton = true, usage }) {
  const [expanded, setExpanded] = useState(false)

  const usageLine = usage ? (
    <p className="essay-ai-usage">
      Проверок сегодня: {usage.used} из {usage.limit}
    </p>
  ) : null

  if (!review) {
    if (!showButton) return null
    return (
      <div className="essay-ai-review essay-ai-review-empty">
        <button type="button" className="btn btn-outline" onClick={onCheck} disabled={checking}>
          {checking ? 'Проверяем…' : 'Проверить с ИИ'}
        </button>
        {usageLine}
        <p className="essay-ai-disclaimer">Не является официальной оценкой.</p>
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

      <p className="essay-ai-disclaimer">Не является официальной оценкой.</p>
    </div>
  )
}
