// Отображает результат AI-проверки задания qa_table (Umformung /
// Satzfortsetzungen) — см. qaTableAiService.js. Не запускает проверку
// само, только рендерит `review` либо кнопку «Проверить с ИИ».

import { useState } from 'react'

export default function QaTableAiReview({ review, onCheck, checking, error, usage }) {
  const [expanded, setExpanded] = useState(false)

  const usageLine = usage ? (
    <p className="essay-ai-usage">
      Проверок этого задания: {usage.used} из {usage.limit}
    </p>
  ) : null

  if (!review) {
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
        <div className="essay-ai-recheck">
          <button type="button" className="btn btn-outline btn-sm" onClick={onCheck} disabled={checking}>
            {checking ? 'Проверяем…' : 'Проверить заново'}
          </button>
          {usageLine}
        </div>
      </div>

      {error && <p className="essay-ai-error">{error}</p>}

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

      <p className="essay-ai-disclaimer">Оценка выполнена нейросетью (Gemini) и может ошибаться.</p>
    </div>
  )
}
