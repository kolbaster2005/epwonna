// Renders the input UI for whichever question.type this question has,
// and — once `checked` is true — colors it according to the verdict.
// TestPage doesn't need to know anything about individual question types;
// it just renders <QuestionAnswerInput question={...} value={...}
// onChange={...} checked={...} verdict={...} />.

import { useState, useEffect } from 'react'
import QuestionImage from './QuestionImage.jsx'
import { getVerdictForPartWithSelfGrade, parseCloze, clozeBlankIds, getVerdictForBlank, getVerdictForRow, getVerdictForTfRow } from '../utils/grading.js'

// Renders "__word__" as an underline — used in qa_table prompts to mark
// which word in the sentence the question is actually about (matching
// how the source exam underlines it), without needing real markup.
function renderUnderline(text) {
  return text.split(/__(.+?)__/g).map((part, i) => (i % 2 === 1 ? <u key={i}>{part}</u> : part))
}

function MultipleChoiceInput({ question, value, onChange, checked }) {
  const selected = value || []
  return (
    <div className="options-list">
      {question.options.map((opt) => {
        const isSelected = selected.includes(opt.id)
        const isCorrectOpt = question.correctOptionIds.includes(opt.id)
        const classes = ['option']
        if (checked) {
          classes.push('locked')
          if (isSelected && isCorrectOpt) classes.push('option-correct')
          if (isSelected && !isCorrectOpt) classes.push('option-wrong')
          if (!isSelected && isCorrectOpt) classes.push('option-missed')
        }
        return (
          <label key={opt.id} className={classes.join(' ')}>
            <input
              type="checkbox"
              name={question.id}
              checked={isSelected}
              disabled={checked}
              onChange={() => {
                const next = isSelected ? selected.filter((id) => id !== opt.id) : [...selected, opt.id]
                onChange(next)
              }}
            />
            <span className="option-mark" />
            <span className="option-text">{opt.text}</span>
          </label>
        )
      })}
    </div>
  )
}

function NumericInput({ question, value, onChange, checked, verdict }) {
  return (
    <div className="numeric-answer">
      <input
        type="text"
        inputMode="decimal"
        className={'numeric-answer-input' + (checked ? ' locked' : '') + (checked && verdict === 'correct' ? ' correct' : '') + (checked && verdict === 'incorrect' ? ' wrong' : '')}
        value={value || ''}
        disabled={checked}
        placeholder="Введите число"
        onChange={(e) => onChange(e.target.value)}
      />
      {question.unit && <span className="numeric-answer-unit">{question.unit}</span>}
      {checked && (
        <span className="numeric-answer-hint">
          Правильный ответ: {question.correctValue}{question.unit ? ` ${question.unit}` : ''}
          {' '}(±{question.tolerance ?? 0.1})
        </span>
      )}
    </div>
  )
}

function TrueFalseInput({ question, value, onChange, checked }) {
  const answers = value || {}
  return (
    <div className="tf-list">
      {question.statements.map((s) => {
        const picked = answers[s.id]
        const isRight = checked && picked === (s.correct ? 'true' : 'false')
        const isWrong = checked && picked && picked !== (s.correct ? 'true' : 'false')
        return (
          <div className={'tf-row' + (isRight ? ' tf-correct' : '') + (isWrong ? ' tf-wrong' : '')} key={s.id}>
            <span className="tf-text">{s.text}</span>
            <div className="tf-toggle">
              <button
                type="button"
                className={'tf-btn' + (picked === 'true' ? ' active' : '')}
                disabled={checked}
                onClick={() => onChange({ ...answers, [s.id]: 'true' })}
              >
                Верно
              </button>
              <button
                type="button"
                className={'tf-btn' + (picked === 'false' ? ' active' : '')}
                disabled={checked}
                onClick={() => onChange({ ...answers, [s.id]: 'false' })}
              >
                Неверно
              </button>
            </div>
          </div>
        )
      })}
    </div>
  )
}

function HeadingMatchInput({ question, value, onChange, checked, verdict }) {
  return (
    <div className="heading-match-answer">
      <input
        type="text"
        className={'heading-match-input' + (checked ? ' locked' : '') + (checked && verdict === 'correct' ? ' correct' : '') + (checked && verdict === 'incorrect' ? ' wrong' : '')}
        value={value || ''}
        disabled={checked}
        placeholder="Например: A, C, B, D"
        onChange={(e) => onChange(e.target.value)}
      />
      <p className="heading-match-hint">
        Введите буквы заголовков через запятую, в порядке абзацев текста — например: A, C, B, D.
      </p>
      {checked && <p className="heading-match-hint">Правильный порядок: {question.correctSequence}</p>}
    </div>
  )
}

// A short fill-in-the-blank word/phrase, checked against one or more
// accepted strings (case/whitespace-insensitive) — Kurzantworten,
// Satzteile ergänzen, Lückentext-style tasks.
function ShortAnswerInput({ question, value, onChange, checked, verdict }) {
  return (
    <div className="short-answer-answer">
      <input
        type="text"
        className={'short-answer-input' + (checked ? ' locked' : '') + (checked && verdict === 'correct' ? ' correct' : '') + (checked && verdict === 'incorrect' ? ' wrong' : '')}
        value={value || ''}
        disabled={checked}
        placeholder="Введите ответ…"
        onChange={(e) => onChange(e.target.value)}
      />
      {checked && verdict === 'incorrect' && (
        <p className="short-answer-hint">Правильный ответ: {question.acceptedAnswers?.[0]}</p>
      )}
    </div>
  )
}

// Auto-sizing inline input — grows/shrinks with what's typed so a blank
// for "ja" doesn't take up the same width as one for "Selbstwertgefühl".
function ClozeBlankInput({ value, onChange, disabled, className }) {
  const content = value || ''
  return (
    <span className="cloze-blank">
      <input
        type="text"
        className={className}
        value={content}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        size={Math.max(3, content.length + 1)}
      />
    </span>
  )
}

// A choice-type blank — inline <select> instead of a text input, for
// cloze questions where each gap has 4 fixed options (a-d) rather than
// an open answer.
function ClozeBlankSelect({ blank, value, onChange, disabled, className }) {
  return (
    <span className="cloze-blank">
      <select className={className} value={value || ''} disabled={disabled} onChange={(e) => onChange(e.target.value)}>
        <option value="" disabled>
          —
        </option>
        {blank.options.map((opt) => (
          <option key={opt.id} value={opt.id}>
            {opt.id}) {opt.text}
          </option>
        ))}
      </select>
    </span>
  )
}

// Reference table for choice-type cloze questions — lists every blank's
// 4 options (matching the source's a/b/c/d grid), including the worked
// example row (label "0"), whose correct option is marked. Rows 1..N
// don't reveal the answer — same as the source, which only marks (0).
function ClozeChoiceTable({ question }) {
  const ids = clozeBlankIds(question.cloze.template)
  const rows = []
  if (question.cloze.exampleChoice) rows.push({ ...question.cloze.exampleChoice, isExample: true })
  ids.forEach((id) => {
    const blank = question.cloze.blanks[id]
    if (blank?.type === 'choice') rows.push({ label: id, options: blank.options })
  })
  if (rows.length === 0) return null
  return (
    <div className="cloze-choice-table-wrap">
      <table className="cloze-choice-table">
        <tbody>
          {rows.map((row) => (
            <tr key={row.label} className={row.isExample ? 'cloze-choice-example' : ''}>
              <td className="cloze-choice-label">({row.label})</td>
              {row.options.map((opt) => (
                <td key={opt.id} className={row.isExample && opt.id === row.correctOptionId ? 'cloze-choice-correct' : ''}>
                  {opt.id}) {opt.text}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// A paragraph with several numbered blanks inline in the running text
// (Lückentext) — e.g. "...Mutter von zwei Kindern, {1} im Internet das
// Plaudern...". Parses question.cloze.template once and renders
// alternating text runs and small auto-sizing inputs right where each
// {N} marker was, instead of pulling the blanks out into a separate list.
function ClozeInput({ question, value, onChange, checked }) {
  const val = value || {}
  const segments = parseCloze(question.cloze.template)
  const wordBank = question.cloze.wordBank
  return (
    <div>
      {wordBank && wordBank.length > 0 && (
        <div className="cloze-word-bank">
          {wordBank.map((word, i) => (
            <span key={i} className={'cloze-word' + (question.cloze.usedWords?.includes(word) ? ' used' : '')}>
              {word}
            </span>
          ))}
        </div>
      )}
      <ClozeChoiceTable question={question} />
      <div className="cloze-text">
        {segments.map((seg, i) => {
          if (seg.type === 'text') return <span key={i}>{seg.text}</span>
          const blank = question.cloze.blanks[seg.id]
          const isChoice = blank?.type === 'choice'
          const blankVerdict = checked ? getVerdictForBlank(question, seg.id, val) : null
          const cls =
            (isChoice ? 'cloze-select' : 'cloze-input') +
            (checked ? ' locked' : '') +
            (blankVerdict === 'correct' ? ' correct' : '') +
            (blankVerdict === 'incorrect' ? ' wrong' : '')
          return (
            <span key={i} className="cloze-blank-wrap">
              {isChoice ? (
                <ClozeBlankSelect
                  blank={blank}
                  value={val[seg.id]}
                  onChange={(v) => onChange({ ...val, [seg.id]: v })}
                  disabled={checked}
                  className={cls}
                />
              ) : (
                <ClozeBlankInput
                  value={val[seg.id]}
                  onChange={(v) => onChange({ ...val, [seg.id]: v })}
                  disabled={checked}
                  className={cls}
                />
              )}
              <sup className="cloze-blank-num">({seg.id})</sup>
              {checked && blankVerdict === 'incorrect' && (
                <span className="cloze-blank-hint">
                  {isChoice
                    ? blank.options.find((o) => o.id === blank.correctOptionId)?.text
                    : blank?.acceptedAnswers?.[0]}
                </span>
              )}
            </span>
          )
        })}
      </div>
    </div>
  )
}

// A 2-column table — one row per prompt, e.g. "Worauf bezieht sich das
// unterstrichene Wort?" / "Von wem stammt die Aussage?". A worked-example
// row (row.given set) shows its answer pre-filled in italics, not an
// input — matches how these exams always show a "Beispiel" row first.
function QaTableInput({ question, value, onChange, checked }) {
  const val = value || {}
  const hasPoints = question.qaTable.rows.some((r) => r.points != null)
  return (
    <div className="qa-table-wrap">
      <table className="qa-table">
        <tbody>
          {question.qaTable.rows.map((row) => {
            const isGiven = row.given !== undefined
            const rowVerdict = checked ? getVerdictForRow(row, val) : null
            return (
              <tr key={row.id} className={isGiven ? 'qa-table-example' : ''}>
                <td className="qa-table-prompt">
                  {isGiven && <span className="qa-table-example-label">Beispiel:</span>} {renderUnderline(row.prompt)}
                </td>
                <td className="qa-table-answer">
                  {isGiven ? (
                    <span className="qa-table-given">{renderUnderline(row.given)}</span>
                  ) : row.freeText ? (
                    <>
                      <textarea
                        className={'qa-table-freetext' + (checked ? ' locked' : '')}
                        rows={3}
                        value={val[row.id] || ''}
                        disabled={checked}
                        placeholder="Введите ответ…"
                        onChange={(e) => onChange({ ...val, [row.id]: e.target.value })}
                      />
                      {row.after && <div className="qa-table-after">{row.after}</div>}
                    </>
                  ) : (
                    <>
                      <input
                        type="text"
                        className={
                          'qa-table-input' +
                          (checked ? ' locked' : '') +
                          (rowVerdict === 'correct' ? ' correct' : '') +
                          (rowVerdict === 'incorrect' ? ' wrong' : '')
                        }
                        value={val[row.id] || ''}
                        disabled={checked}
                        onChange={(e) => onChange({ ...val, [row.id]: e.target.value })}
                      />
                      {checked && rowVerdict === 'incorrect' && (
                        <div className="qa-table-hint">{row.acceptedAnswers?.[0]}</div>
                      )}
                    </>
                  )}
                </td>
                {hasPoints && <td className="qa-table-points">{row.points ?? ''}</td>}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

// "Richtig-Falsch mit Belegsatz": per row, pick richtig/falsch, then type
// the first four words of the sentence that proves it. The point only
// counts if both the choice and all four words match — see
// getVerdictForTfRow in grading.js.
function TfTableInput({ question, value, onChange, checked }) {
  const val = value || {}

  function setChoice(rowId, choice) {
    onChange({ ...val, [rowId]: { ...(val[rowId] || { words: ['', '', '', ''] }), choice } })
  }
  function setWord(rowId, wordIndex, text) {
    const current = val[rowId] || { choice: '', words: ['', '', '', ''] }
    const words = [...current.words]
    words[wordIndex] = text
    onChange({ ...val, [rowId]: { ...current, words } })
  }

  return (
    <div className="tf-evidence-wrap">
      <table className="tf-evidence-table">
        <thead>
          <tr>
            <th className="tf-evidence-statement-head" />
            <th>richtig</th>
            <th>falsch</th>
            <th colSpan={4}>Die ersten vier Wörter des Beweissatzes</th>
          </tr>
          <tr>
            <th />
            <th />
            <th />
            <th>1</th>
            <th>2</th>
            <th>3</th>
            <th>4</th>
          </tr>
        </thead>
        <tbody>
          {question.tfTable.rows.map((row) => {
            const rowValue = val[row.id] || { choice: '', words: ['', '', '', ''] }
            const rowVerdict = checked ? getVerdictForTfRow(row, rowValue) : null
            return (
              <tr key={row.id} className={row.isExample ? 'tf-evidence-example' : ''}>
                <td className="tf-evidence-statement">
                  {row.isExample && <strong>Beispiel: </strong>}
                  {row.statement}
                </td>
                {['true', 'false'].map((choice) => (
                  <td className="tf-evidence-choice-cell" key={choice}>
                    {row.isExample ? (
                      (row.correct ? choice === 'true' : choice === 'false') && <span className="tf-evidence-x">X</span>
                    ) : (
                      <button
                        type="button"
                        disabled={checked}
                        className={
                          'tf-evidence-choice' +
                          (rowValue.choice === choice ? ' selected' : '') +
                          (checked && rowValue.choice === choice && rowVerdict ? ` ${rowVerdict}` : '')
                        }
                        onClick={() => setChoice(row.id, choice)}
                        aria-label={choice === 'true' ? 'richtig' : 'falsch'}
                      >
                        {rowValue.choice === choice ? 'X' : ''}
                      </button>
                    )}
                  </td>
                ))}
                {[0, 1, 2, 3].map((i) => (
                  <td className="tf-evidence-word-cell" key={i}>
                    {row.isExample ? (
                      row.words[i]
                    ) : (
                      <input
                        type="text"
                        className={'tf-evidence-word-input' + (checked ? ' locked' : '')}
                        value={rowValue.words[i] || ''}
                        disabled={checked}
                        onChange={(e) => setWord(row.id, i, e.target.value)}
                      />
                    )}
                  </td>
                ))}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function FreeTextInput({ value, onChange, checked }) {
  return (
    <div className="free-text-answer">
      <textarea
        rows={8}
        value={value || ''}
        disabled={checked}
        placeholder="Введите ваш ответ…"
        onChange={(e) => onChange(e.target.value)}
      />
      <p className="free-text-note">
        Это задание пока не проверяется автоматически — просто зафиксируйте ответ и переходите дальше.
      </p>
    </div>
  )
}

// "Schreibaufgabe"-style: pick ONE of two prompts, then write a free-form
// answer to it. Never graded — TestPage.jsx separately persists this one
// to essay_submissions once it locks, so it shows up later under
// МОЁ ОБУЧЕНИЕ. Switching the choice before submitting just swaps which
// prompt is shown; the draft text isn't tied to a specific option, so
// re-reading it against a different prompt is on the person, same as
// changing your mind on a real exam before you start writing for real.
function EssayChoiceInput({ question, value, onChange, checked }) {
  const val = value || { choice: null, text: '' }
  const options = question.essayChoice.options

  if (!val.choice) {
    return (
      <div className="essay-choice-picker">
        <p className="admin-note">Выберите одну из двух тем — вторая станет недоступна для этой попытки.</p>
        <div className="essay-choice-cards">
          {options.map((opt) => (
            <button
              type="button"
              key={opt.id}
              className="essay-choice-card"
              onClick={() => onChange({ ...val, choice: opt.id })}
            >
              <span className="essay-choice-card-title">{opt.title}</span>
              {opt.instructions?.[0] && <span className="essay-choice-card-preview">{opt.instructions[0]}</span>}
            </button>
          ))}
        </div>
      </div>
    )
  }

  const chosen = options.find((o) => o.id === val.choice)

  return (
    <div className="essay-choice-answer">
      <div className="essay-choice-head">
        <span className="essay-choice-title">{chosen.title}</span>
        {!checked && (
          <button type="button" className="essay-choice-switch" onClick={() => onChange({ ...val, choice: null })}>
            Выбрать другую тему
          </button>
        )}
      </div>

      {chosen.text && <p className="essay-choice-excerpt">{chosen.text}</p>}
      {chosen.image && <QuestionImage name={chosen.image} />}

      {chosen.instructions?.length > 0 && (
        <ol className="essay-choice-instructions">
          {chosen.instructions.map((line, i) => (
            <li key={i}>{line}</li>
          ))}
        </ol>
      )}

      <textarea
        className="essay-choice-textarea"
        rows={14}
        value={val.text}
        disabled={checked}
        placeholder="Пишите здесь…"
        onChange={(e) => onChange({ ...val, text: e.target.value })}
      />
      <p className="free-text-note">
        Это задание не проверяется автоматически — текст сохранится и будет доступен позже в разделе «Моё обучение».
      </p>
    </div>
  )
}

// A fillable grid — some cells are `{ given }` (shown as plain text, not
// editable, e.g. numbers stated directly in the question), the rest are
// `{ correctValue, tolerance? }` for the student to compute and type in.
// Used as a `table`-type part inside a multi_part question (see the
// contingency-table example in supabase/seed.sql).
function TableInput({ table, value, onChange, checked }) {
  const val = value || {}
  return (
    <div className="answer-table-wrap">
      <table className="answer-table">
        <thead>
          <tr>
            <th />
            {table.columns.map((c, i) => (
              <th key={i}>{c}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {table.rows.map((rowLabel, r) => (
            <tr key={r}>
              <th>{rowLabel}</th>
              {table.columns.map((_, c) => {
                const cell = table.cells[r][c]
                if (cell.given !== undefined) {
                  return (
                    <td key={c} className="answer-table-given">
                      {cell.given}
                    </td>
                  )
                }
                const key = `r${r}c${c}`
                const entered = val[key] || ''
                let cellClass = ''
                if (checked) {
                  const enteredNum = parseFloat(String(entered).replace(',', '.'))
                  const tol = cell.tolerance ?? 1
                  cellClass = !Number.isNaN(enteredNum) && Math.abs(enteredNum - cell.correctValue) <= tol ? 'correct' : 'wrong'
                }
                return (
                  <td key={c} className={'answer-table-cell' + (cellClass ? ` ${cellClass}` : '')}>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={entered}
                      disabled={checked}
                      onChange={(e) => onChange({ ...val, [key]: e.target.value })}
                    />
                    {cellClass === 'wrong' && <span className="answer-table-hint">{cell.correctValue}</span>}
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

const PART_VERDICT_LABEL = { correct: 'Верно', partial: 'Частично верно', incorrect: 'Неверно', ungraded: 'Ответ сохранён' }

// A "pick one of N" part inside multi_part — radio buttons, not
// checkboxes (unlike the top-level multiple_choice type, which allows
// several correct answers). isExample renders it read-only with the
// correct option marked, instead of an interactive input.
function SingleChoicePartInput({ part, value, onChange, checked }) {
  if (part.isExample) {
    return (
      <div className="options-list single-choice example">
        {part.options.map((opt) => (
          <div key={opt.id} className={'option locked' + (opt.id === part.correctOptionId ? ' option-correct' : '')}>
            <span className="option-mark radio" />
            <span className="option-text">{opt.id}) {opt.text}</span>
          </div>
        ))}
      </div>
    )
  }
  return (
    <div className="options-list single-choice">
      {part.options.map((opt) => {
        const isSelected = value === opt.id
        const isCorrectOpt = opt.id === part.correctOptionId
        const classes = ['option']
        if (checked) {
          classes.push('locked')
          if (isSelected && isCorrectOpt) classes.push('option-correct')
          if (isSelected && !isCorrectOpt) classes.push('option-wrong')
          if (!isSelected && isCorrectOpt) classes.push('option-missed')
        }
        return (
          <label key={opt.id} className={classes.join(' ')}>
            <input type="radio" name={part.id} checked={isSelected} disabled={checked} onChange={() => onChange(opt.id)} />
            <span className="option-mark radio" />
            <span className="option-text">{opt.id}) {opt.text}</span>
          </label>
        )
      })}
    </div>
  )
}

// A single question stem with several independently-graded parts — the
// classic "a) fill in the table, b) i.–iv. compute these probabilities"
// exam layout. One "Ответить" locks/checks every part at once; each part
// still shows its own verdict so the person can see exactly which bits
// they got right.
// One part's label + input — shared between the stacked layout (few
// parts) and the paginated layout (many parts, see MultiPartInput below).
function MultiPartItem({ part, value, onChange, checked, selfGrade, onSelfGrade }) {
  const partVerdict = checked ? getVerdictForPartWithSelfGrade(part, value, selfGrade) : null
  const showSelfGrade = checked && !part.isExample && part.type === 'free_text' && partVerdict === 'ungraded'
  return (
    <div className="multi-part-item">
      <div className="multi-part-label">
        {part.isExample && <strong>Beispiel: </strong>}
        {renderUnderline(part.label)}
        {checked && partVerdict && !part.isExample && (
          <span className={`multi-part-verdict ${partVerdict}`}>{PART_VERDICT_LABEL[partVerdict]}</span>
        )}
      </div>
      {part.hint && <p className="multi-part-hint">{part.hint}</p>}
      {part.type === 'table' ? (
        <TableInput table={part.table} value={value} onChange={onChange} checked={checked} />
      ) : part.type === 'free_text' ? (
        <>
          <textarea
            className="multi-part-freetext"
            rows={4}
            value={value || ''}
            disabled={checked}
            placeholder="Введите ваш ответ…"
            onChange={(e) => onChange(e.target.value)}
          />
          {checked && part.sampleAnswer && (
            <div className="multi-part-sample-answer">
              <span className="multi-part-sample-answer-label">Примерный ответ:</span> {part.sampleAnswer}
            </div>
          )}
        </>
      ) : part.type === 'short_answer' ? (
        <ShortAnswerInput question={part} value={value} onChange={onChange} checked={checked} verdict={partVerdict} />
      ) : part.type === 'single_choice' ? (
        <SingleChoicePartInput part={part} value={value} onChange={onChange} checked={checked} />
      ) : (
        <NumericInput question={part} value={value} onChange={onChange} checked={checked} verdict={partVerdict} />
      )}
      {showSelfGrade && (
        <div className="self-grade-buttons part">
          <span className="self-grade-prompt">Проверьте сами:</span>
          <button type="button" className="self-grade-btn correct" onClick={() => onSelfGrade?.('correct')}>
            ✓ Верно
          </button>
          <button type="button" className="self-grade-btn incorrect" onClick={() => onSelfGrade?.('incorrect')}>
            ✕ Неверно
          </button>
        </div>
      )}
      {checked && part.type === 'free_text' && typeof selfGrade === 'string' && (
        <p className="self-grade-note">Отмечено вами как «{selfGrade === 'correct' ? 'верно' : 'неверно'}».</p>
      )}
    </div>
  )
}

// Stacking every part on one screen works for a handful of them (EPM's
// "a) b) c) d)"-style problems), but falls apart once there are many —
// e.g. an 11-item Single-Choice-Aufgabe becomes one huge scrolling wall,
// hard to read against the reading passage next to it. Past a threshold,
// show one part at a time with a compact number-navigator instead.
export const PAGINATE_THRESHOLD = 3

function MultiPartInput({ question, value, onChange, checked, selfGrade, onSelfGradePart, partIndex, onPartIndexChange }) {
  const val = value || {}
  const parts = question.parts
  const partGrades = selfGrade && typeof selfGrade === 'object' ? selfGrade : {}
  const [internalCurrent, setInternalCurrent] = useState(0)
  // Controlled by TestPage.jsx when provided — so the top-level "Далее"
  // button can step through parts before moving to the next question
  // (see TestPage.jsx's handleNext). Falls back to owning its own state
  // if used anywhere without that wiring.
  const current = partIndex ?? internalCurrent
  const setCurrent = onPartIndexChange ?? setInternalCurrent

  // Reset to the first part whenever the question itself changes — this
  // component instance can persist across a sidebar navigation (React
  // doesn't remount it just because the props changed).
  useEffect(() => {
    setCurrent(0)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [question.id])

  if (parts.length <= PAGINATE_THRESHOLD) {
    return (
      <div className="multi-part">
        {parts.map((part) => (
          <MultiPartItem
            key={part.id}
            part={part}
            value={val[part.id]}
            onChange={(v) => onChange({ ...val, [part.id]: v })}
            checked={checked}
            selfGrade={partGrades[part.id]}
            onSelfGrade={onSelfGradePart ? (grade) => onSelfGradePart(part.id, grade) : undefined}
          />
        ))}
      </div>
    )
  }

  const part = parts[current]
  return (
    <div className="multi-part paginated">
      <div className="multi-part-pager">
        {parts.map((p, i) => {
          const v = checked ? getVerdictForPartWithSelfGrade(p, val[p.id], partGrades[p.id]) : null
          const classes = ['multi-part-pager-num']
          if (i === current) classes.push('current')
          if (p.isExample) classes.push('example')
          else if (v) classes.push(v)
          else if (hasPartValue(val[p.id])) classes.push('answered')
          return (
            <button type="button" key={p.id} className={classes.join(' ')} onClick={() => setCurrent(i)}>
              {i + 1}
            </button>
          )
        })}
      </div>

      <MultiPartItem
        part={part}
        value={val[part.id]}
        onChange={(v) => onChange({ ...val, [part.id]: v })}
        checked={checked}
        selfGrade={partGrades[part.id]}
        onSelfGrade={onSelfGradePart ? (grade) => onSelfGradePart(part.id, grade) : undefined}
      />
    </div>
  )
}

function hasPartValue(v) {
  if (v == null) return false
  if (typeof v === 'string') return v.trim() !== ''
  if (typeof v === 'object') return Object.values(v).some((x) => (x ?? '').toString().trim() !== '')
  return false
}

export default function QuestionAnswerInput({ question, value, onChange, checked, verdict, selfGrade, onSelfGradePart, partIndex, onPartIndexChange }) {
  switch (question.type) {
    case 'numeric':
      return <NumericInput question={question} value={value} onChange={onChange} checked={checked} verdict={verdict} />
    case 'true_false':
      return <TrueFalseInput question={question} value={value} onChange={onChange} checked={checked} />
    case 'heading_match':
      return <HeadingMatchInput question={question} value={value} onChange={onChange} checked={checked} verdict={verdict} />
    case 'short_answer':
      return <ShortAnswerInput question={question} value={value} onChange={onChange} checked={checked} verdict={verdict} />
    case 'cloze':
      return <ClozeInput question={question} value={value} onChange={onChange} checked={checked} />
    case 'qa_table':
      return <QaTableInput question={question} value={value} onChange={onChange} checked={checked} />
    case 'tf_table':
      return <TfTableInput question={question} value={value} onChange={onChange} checked={checked} />
    case 'free_text':
      return <FreeTextInput value={value} onChange={onChange} checked={checked} />
    case 'essay_choice':
      return <EssayChoiceInput question={question} value={value} onChange={onChange} checked={checked} />
    case 'multi_part':
      return (
        <MultiPartInput
          question={question}
          value={value}
          onChange={onChange}
          checked={checked}
          selfGrade={selfGrade}
          onSelfGradePart={onSelfGradePart}
          partIndex={partIndex}
          onPartIndexChange={onPartIndexChange}
        />
      )
    case 'multiple_choice':
    default:
      return <MultipleChoiceInput question={question} value={value} onChange={onChange} checked={checked} />
  }
}
