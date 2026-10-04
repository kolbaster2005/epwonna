// Текст сочинения с подсветкой ошибок от ИИ-проверки (см.
// feedback.annotations в essayAiService.js — массив { start, end, quote,
// type, comment }, уже с точными позициями в submittedText, посчитанными
// на сервере в check-essay/index.ts). Подсвеченные участки — <mark> с
// попапом-комментарием по наведению/фокусу (для доступности с клавиатуры).

const TYPE_LABELS = {
  'word-order': 'Порядок слов',
  grammar: 'Грамматика',
  spelling: 'Орфография',
  article: 'Артикль',
  punctuation: 'Пунктуация',
  lexical: 'Лексика',
  other: 'Ошибка',
}

export default function EssayAnnotatedText({ text, annotations }) {
  if (!text) return null

  const valid = (annotations || []).filter(
    (a) => Number.isFinite(a?.start) && Number.isFinite(a?.end) && a.end > a.start && a.end <= text.length
  )

  if (valid.length === 0) {
    return <div className="essay-annotated-text">{text}</div>
  }

  const segments = []
  let cursor = 0
  valid.forEach((a, i) => {
    if (a.start > cursor) segments.push({ key: `t${i}`, text: text.slice(cursor, a.start) })
    segments.push({ key: `a${i}`, text: text.slice(a.start, a.end), annotation: a })
    cursor = a.end
  })
  if (cursor < text.length) segments.push({ key: 'tail', text: text.slice(cursor) })

  return (
    <div className="essay-annotated-text">
      {segments.map((seg) =>
        seg.annotation ? (
          <mark key={seg.key} className="essay-annotation" tabIndex={0}>
            {seg.text}
            <span className="essay-annotation-tooltip" role="tooltip">
              <span className="essay-annotation-type">{TYPE_LABELS[seg.annotation.type] || TYPE_LABELS.other}</span>
              {seg.annotation.comment}
            </span>
          </mark>
        ) : (
          <span key={seg.key}>{seg.text}</span>
        )
      )}
    </div>
  )
}
