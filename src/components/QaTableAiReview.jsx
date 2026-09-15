// Отображает результат AI-проверки задания qa_table (Umformung /
// Satzfortsetzungen) — см. qaTableAiService.js. Не запускает проверку
// само, только рендерит `review` либо кнопку «Проверить с ИИ» (если
// showButton — иначе кнопка стоит снаружи, см. TestPage.jsx, рядом с
// «Ответить»). Ошибки валидации/сети показываются снаружи, в общем
// блоке под рядом кнопок — не здесь.

import { useState } from 'react'

export default function QaTableAiReview({ review, onCheck, checking, showButton = true, usage }) {
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
  const rows = feedback?.rows || []

  return (
    <div className="essay-ai-review">
      <div className="essay-ai-review-head">
        <div className="essay-ai-overall">
          <span className="essay-ai-band">
            {feedback?.totalScore} из {feedback?.totalMax} баллов
          </span>
          {feedback?.overallComment && <span className="essay-ai-overall-comment">{feedback.overallComment}</span>}
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

      {rows.length > 0 && (
        <>
          <button type="button" className="essay-ai-toggle" onClick={() => setExpanded((e) => !e)}>
            {expanded ? 'Скрыть подробности по строкам' : 'Показать подробности по строкам'}
          </button>

          {expanded && (
            <div className="essay-ai-details">
              <div className="essay-ai-criteria">
                {rows.map((r, i) => (
                  <div className="essay-ai-criterion" key={r.id ?? i}>
                    <div className="essay-ai-criterion-head">
                      <span className="essay-ai-criterion-name">Строка {i + 1}</span>
                      <span className="essay-ai-criterion-band">
                        {r.score} из {r.maxScore}
                      </span>
                    </div>
                    <p className="essay-ai-criterion-comment">{r.comment}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      <p className="essay-ai-disclaimer">Не является официальной оценкой.</p>
    </div>
  )
}
