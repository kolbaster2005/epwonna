// ---------------------------------------------------------------------
// Per-question-type grading.
//
// Every question has a `type`, and each type defines its own answer
// shape and its own rule for what counts as correct:
//
//   multiple_choice  answer = string[]  (selected option ids)
//   numeric          answer = string    (raw input; math only, graded
//                                        with a tolerance — see below)
//   true_false       answer = { [statementId]: 'true' | 'false' }
//   heading_match    answer = string    (e.g. "A, C, B, D" — despite the
//                                        name this is really "type the
//                                        correct letter/number sequence",
//                                        reused for any lettered-matching
//                                        task: Wer sagt was?, Fragen den
//                                        Antworten zuordnen, Umschreibungen
//                                        finden, Bezugswörter zuordnen…)
//   short_answer     answer = string    (a short fill-in-the-blank word
//                                        or phrase — Kurzantworten,
//                                        Satzteile ergänzen — checked
//                                        against one or more accepted
//                                        strings, see below)
//   cloze            answer = { [blankId]: string } — a paragraph with
//                                        several numbered blanks *inline*
//                                        in the running text (Lückentext),
//                                        e.g. "...Mutter von zwei Kindern,
//                                        {1} im Internet das Plaudern..."
//                                        — each blank graded the same way
//                                        as short_answer, individually
//   qa_table         answer = { [rowId]: string } — a 2-column table,
//                                        one row per prompt: "Worauf
//                                        bezieht sich...?" / "Von wem
//                                        stammt...?" style tasks. A row
//                                        can instead be `{ given }` — a
//                                        pre-filled worked example, shown
//                                        but never counted as gradable.
//   tf_table         answer = { [rowId]: { choice: 'true'|'false',
//                                        words: [string, string, string,
//                                        string] } } — "Richtig-Falsch mit
//                                        Belegsatz": per row, pick
//                                        richtig/falsch AND type the
//                                        first four words of the sentence
//                                        that proves it. The point only
//                                        counts if BOTH match — that's
//                                        the whole "mit Belegsatz" idea,
//                                        so unlike other table types this
//                                        one has no partial credit at the
//                                        row level, just correct/incorrect.
//   free_text        answer = string    (essay/blog-post response —
//                                        never auto-graded)
//   essay_choice     answer = { choice: string|null, text: string } —
//                                        "Schreibaufgabe"-style: pick ONE
//                                        of two prompts (question.
//                                        essayChoice.options), then write
//                                        a free-form answer to it. Never
//                                        auto-graded — TestPage.jsx also
//                                        persists this one to the
//                                        essay_submissions table once it
//                                        locks, so it can be reviewed
//                                        later under МОЁ ОБУЧЕНИЕ.
//   multi_part       answer = { [partId]: <shape depends on part.type> }
//                                        — one shared question stem with
//                                        several independently-graded
//                                        parts (see below)
//
// A `multi_part` question has `parts: [{ id, label, type, ... }]`. Each
// part is graded with the same rules as a top-level question of that
// type would be, just scoped to that part. Part types supported so far:
//   numeric        — correctValue, tolerance, unit
//   single_choice  — options: [{id,text}], correctOptionId (pick one of
//                    N, radio-style — for "Single-Choice-Aufgaben" tasks
//                    with several numbered items sharing one instruction)
//   short_answer   — acceptedAnswers (see gradeShortAnswer below)
//   table          — a fillable grid: some cells are `{ given }` (shown,
//                    not editable), the rest are `{ correctValue,
//                    tolerance? }` for the student to fill in
//   free_text      — never graded
// Any part can also be marked `isExample: true` — shown to the student
// worked out already (read-only), and always excluded from grading —
// matches how these exams always show a "Beispiel (0)" first.
//
// getVerdict() returns one of:
//   null         — not answered yet, or this type is never auto-graded
//   'correct'    'partial'   'incorrect'   — for auto-graded types
//   'ungraded'   — answered, but this question type has no automatic
//                  checking (free_text) — still shown as "submitted"
//                  everywhere (sidebar, feedback), just with a neutral
//                  color instead of green/orange/red.
// ---------------------------------------------------------------------

export function defaultValue(type) {
  switch (type) {
    case 'true_false':
    case 'multi_part':
    case 'cloze':
    case 'qa_table':
    case 'tf_table':
      return {}
    case 'essay_choice':
      return { choice: null, text: '' }
    case 'multiple_choice':
      return []
    default:
      return '' // numeric, heading_match, short_answer, free_text
  }
}

// Shared by top-level numeric questions, numeric multi_part parts, and
// individual table cells — all three are "enter a number, compare with
// a tolerance" underneath.
function gradeNumeric(rawValue, correctValue, tolerance = 0.1) {
  const entered = parseFloat(String(rawValue).replace(',', '.'))
  if (Number.isNaN(entered)) return 'incorrect'
  return Math.abs(entered - correctValue) <= tolerance ? 'correct' : 'incorrect'
}

// Case/whitespace-insensitive match against a list of accepted answers —
// exam fill-in-the-blank tasks often have more than one acceptable
// wording ("bekommen" vs. "erhalten"), so this is a list, not a single
// string.
function normalizeText(s) {
  return s.trim().toLowerCase().replace(/\s+/g, ' ')
}

function gradeShortAnswer(rawValue, acceptedAnswers) {
  const given = normalizeText(String(rawValue))
  return (acceptedAnswers || []).some((a) => normalizeText(a) === given) ? 'correct' : 'incorrect'
}

// ---- cloze (inline fill-in-the-blank paragraph) --------------------------
// Template markers look like {1}, {2}, ... — split the template on them to
// get alternating text/blank segments. Exported so QuestionAnswerInput.jsx
// renders exactly the blanks this parses, never a different set.
const CLOZE_MARKER = /\{(\d+)\}/g

export function parseCloze(template) {
  const segments = []
  let lastIndex = 0
  let match
  CLOZE_MARKER.lastIndex = 0
  while ((match = CLOZE_MARKER.exec(template))) {
    if (match.index > lastIndex) segments.push({ type: 'text', text: template.slice(lastIndex, match.index) })
    segments.push({ type: 'blank', id: match[1] })
    lastIndex = match.index + match[0].length
  }
  if (lastIndex < template.length) segments.push({ type: 'text', text: template.slice(lastIndex) })
  return segments
}

export function clozeBlankIds(template) {
  return parseCloze(template)
    .filter((s) => s.type === 'blank')
    .map((s) => s.id)
}

export function getVerdictForBlank(question, blankId, value) {
  const raw = value?.[blankId]
  if (!raw || !raw.toString().trim()) return null
  const blank = question.cloze.blanks[blankId]
  if (blank?.type === 'choice') return raw === blank.correctOptionId ? 'correct' : 'incorrect'
  return gradeShortAnswer(raw, blank?.acceptedAnswers)
}

// ---- qa_table (2-column table: prompt | answer) ---------------------------
// A row is one of:
//   { given }             — a pre-filled worked example, shown but never
//                            counted as needing an answer or gradable
//   { acceptedAnswers }   — short answer, graded exactly (see
//                            gradeShortAnswer)
//   { freeText: true }    — a longer written answer (a whole rewritten
//                            sentence, a continued sentence, ...) with no
//                            single correct answer — required to be
//                            filled in like any other row, but never
//                            graded and never counted in the aggregate
//                            score, same idea as free_text elsewhere
export function qaTableGradableRows(qaTable) {
  return qaTable.rows.filter((r) => r.given === undefined)
}

// "Editing" rows ({ editing: true, correct, acceptedAnswers }) store an
// object { choice: 'correct' | 'incorrect', word } instead of a plain
// string — richtig/falsch per line, with a text field for the wrong word
// only appearing once "falsch" is picked. Needs its own has-answered
// check since a plain (value ?? '').toString() on that object would
// stringify to "[object Object]" and always look "answered".
function qaTableRowHasAnswer(row, raw) {
  if (row.editing) return !!raw?.choice && (raw.choice === 'correct' || (raw.word ?? '').toString().trim() !== '')
  return (raw ?? '').toString().trim() !== ''
}

// Rows that actually count toward the correct/partial/incorrect verdict
// — excludes both given (never needed one) and freeText (no right answer
// to check) rows.
export function qaTableScoredRows(qaTable) {
  return qaTable.rows.filter((r) => r.given === undefined && !r.freeText)
}

export function getVerdictForRow(row, value) {
  if (row.given !== undefined) return null
  const raw = value?.[row.id]
  if (row.editing) return getVerdictForEditingRow(row, raw)
  if (!raw || !raw.toString().trim()) return null
  if (row.freeText) return 'ungraded'
  return gradeShortAnswer(raw, row.acceptedAnswers)
}

// "Editing" row — richtig/falsch per line (row.correct is the answer
// key), with a text field for the wrong word that only matters when
// falsch is picked. Both the choice AND (if falsch) the word need to
// match for the row to count as correct.
export function getVerdictForEditingRow(row, rowValue) {
  if (!rowValue?.choice) return null
  if (rowValue.choice === 'incorrect' && !(rowValue.word ?? '').toString().trim()) return null
  const choiceOk = rowValue.choice === (row.correct ? 'correct' : 'incorrect')
  if (row.correct) return choiceOk ? 'correct' : 'incorrect'
  const wordOk = row.acceptedAnswers?.some((w) => normalizeText(rowValue.word) === normalizeText(w))
  return choiceOk && wordOk ? 'correct' : 'incorrect'
}

// ---- tf_table ("Richtig-Falsch mit Belegsatz") ----------------------------
// A row is gradable unless marked isExample (shown pre-filled, matching
// the source exam's "Beispiel (0)" row). row.correct/row.words are always
// the answer key — isExample only controls whether the student answers it
// or just sees it worked out.
export function tfTableGradableRows(tfTable) {
  return tfTable.rows.filter((r) => !r.isExample)
}

export function getVerdictForTfRow(row, rowValue) {
  if (row.isExample) return null
  if (!rowValue?.choice) return null
  if (!row.words.every((_, i) => (rowValue.words?.[i] || '').toString().trim() !== '')) return null
  const choiceOk = rowValue.choice === (row.correct ? 'true' : 'false')
  const wordsOk = row.words.every((w, i) => normalizeText(rowValue.words[i]) === normalizeText(w))
  return choiceOk && wordsOk ? 'correct' : 'incorrect'
}

// ---- multi_part helpers (also used directly by QuestionAnswerInput.jsx
// to color individual parts/cells while the parent question is one
// "Ответить" unit) --------------------------------------------------------

export function tableCells(table) {
  // Flat list of { r, c, cell } for every blank (student-fillable) cell —
  // walking table.cells (a 2D array) is repeated in a few places below.
  const out = []
  table.cells.forEach((row, r) => {
    row.forEach((cell, c) => {
      if (cell.given === undefined) out.push({ r, c, cell })
    })
  })
  return out
}

export function hasAnswerForPart(part, value) {
  // A worked example ("Beispiel") is shown pre-filled, never answered by
  // the student — treat it as always satisfied so it can't block the
  // "Ответить" button. Same isExample flag tf_table rows already use.
  if (part.isExample) return true
  if (part.type === 'table') {
    if (!value) return false
    return tableCells(part.table).every(({ r, c }) => (value[`r${r}c${c}`] ?? '').toString().trim() !== '')
  }
  // numeric, short_answer, single_choice, free_text (and anything else
  // with a plain string answer)
  return typeof value === 'string' && value.trim().length > 0
}

export function getVerdictForPart(part, value) {
  // Excluded from grading entirely — same reasoning as free_text parts
  // (see the multi_part case in getVerdict below, which filters out
  // 'ungraded' before computing the aggregate).
  if (part.isExample) return 'ungraded'
  if (!hasAnswerForPart(part, value)) return null
  if (part.type === 'table') {
    const cells = tableCells(part.table)
    const correctCount = cells.filter(
      ({ r, c, cell }) => gradeNumeric(value[`r${r}c${c}`], cell.correctValue, cell.tolerance ?? 1) === 'correct'
    ).length
    if (correctCount === cells.length) return 'correct'
    if (correctCount === 0) return 'incorrect'
    return 'partial'
  }
  if (part.type === 'free_text') return 'ungraded'
  if (part.type === 'short_answer') return gradeShortAnswer(value, part.acceptedAnswers)
  if (part.type === 'single_choice') return value === part.correctOptionId ? 'correct' : 'incorrect'
  // numeric part
  return gradeNumeric(value, part.correctValue, part.tolerance ?? 0.1)
}

export function hasAnswer(question, value) {
  switch (question.type) {
    case 'numeric':
    case 'heading_match':
    case 'short_answer':
    case 'free_text':
      return typeof value === 'string' && value.trim().length > 0
    case 'true_false':
      return !!value && question.statements.every((s) => value[s.id] === 'true' || value[s.id] === 'false')
    case 'multi_part':
      return !!value && question.parts.every((p) => hasAnswerForPart(p, value[p.id]))
    case 'cloze': {
      const ids = clozeBlankIds(question.cloze.template)
      return !!value && ids.every((id) => (value[id] ?? '').toString().trim() !== '')
    }
    case 'qa_table': {
      const rows = qaTableGradableRows(question.qaTable)
      return !!value && rows.every((r) => qaTableRowHasAnswer(r, value[r.id]))
    }
    case 'tf_table': {
      const rows = tfTableGradableRows(question.tfTable)
      return (
        !!value &&
        rows.every((r) => {
          const rv = value[r.id]
          return !!rv?.choice && r.words.every((_, i) => (rv.words?.[i] ?? '').toString().trim() !== '')
        })
      )
    }
    case 'essay_choice':
      return !!value?.choice && typeof value.text === 'string' && value.text.trim().length > 0
    case 'multiple_choice':
    default:
      return Array.isArray(value) && value.length > 0
  }
}

export function isAutoGraded(question) {
  return question.type !== 'free_text' && question.type !== 'essay_choice'
}

// Looser than hasAnswer — true as soon as *something* has been entered,
// even if the question isn't complete yet. Used to tell "genuinely
// untouched" apart from "started but not finished" (sidebar draft dots,
// and the "you've left something blank" hint near a disabled "Ответить"
// button) — hasAnswer alone can't distinguish those two, since it's an
// all-or-nothing completeness check.
function hasAnyAnswerForPart(part, value) {
  if (part.isExample) return true
  if (part.type === 'table') {
    if (!value) return false
    return tableCells(part.table).some(({ r, c }) => (value[`r${r}c${c}`] ?? '').toString().trim() !== '')
  }
  return typeof value === 'string' && value.trim().length > 0
}

export function hasAnyAnswer(question, value) {
  switch (question.type) {
    case 'numeric':
    case 'heading_match':
    case 'short_answer':
    case 'free_text':
      return typeof value === 'string' && value.trim().length > 0
    case 'true_false':
      return !!value && question.statements.some((s) => value[s.id] === 'true' || value[s.id] === 'false')
    case 'multi_part':
      return !!value && question.parts.some((p) => hasAnyAnswerForPart(p, value[p.id]))
    case 'cloze': {
      const ids = clozeBlankIds(question.cloze.template)
      return !!value && ids.some((id) => (value[id] ?? '').toString().trim() !== '')
    }
    case 'qa_table': {
      const rows = qaTableGradableRows(question.qaTable)
      return !!value && rows.some((r) => qaTableRowHasAnswer(r, value[r.id]))
    }
    case 'tf_table': {
      const rows = tfTableGradableRows(question.tfTable)
      return (
        !!value &&
        rows.some((r) => {
          const rv = value[r.id]
          return !!rv?.choice || (r.words || []).some((_, i) => (rv?.words?.[i] ?? '').toString().trim() !== '')
        })
      )
    }
    case 'essay_choice':
      return !!value?.choice || (typeof value?.text === 'string' && value.text.trim().length > 0)
    case 'multiple_choice':
    default:
      return Array.isArray(value) && value.length > 0
  }
}

// ---------------------------------------------------------------------
// Self-grading: some question types (free_text, essay_choice) and some
// multi_part parts (free_text) can't be auto-checked at all — a sketch,
// a proof, a piece of free writing. Rather than leave those forever
// "ungraded", the person can mark their own answer right/wrong after
// checking it themselves against the answer key. This is layered on
// top of getVerdict/getVerdictForPart, not mixed into them — auto
// grading stays pure, self-grades are an explicit overlay supplied by
// the caller (TestPage.jsx's `selfGrades` state).
//
// selfGrades shape: { [questionId]: 'correct' | 'incorrect' | { [partId]: 'correct' | 'incorrect' } }
// — a plain string for whole-question self-grading (free_text,
// essay_choice, or a qa_table that's entirely freeText rows), or an
// object keyed by partId for multi_part questions (each free_text part
// self-graded independently, then folded into the question's overall
// verdict same as any other part).
// ---------------------------------------------------------------------

export function getVerdictForPartWithSelfGrade(part, value, selfGrade) {
  const v = getVerdictForPart(part, value)
  if (v === 'ungraded' && (selfGrade === 'correct' || selfGrade === 'incorrect')) return selfGrade
  return v
}

export function getVerdictWithSelfGrade(question, value, selfGrade) {
  if (question.type === 'multi_part') {
    if (!hasAnswer(question, value)) return null
    const partGrades = selfGrade && typeof selfGrade === 'object' ? selfGrade : {}
    const verdicts = question.parts.map((p) => getVerdictForPartWithSelfGrade(p, value[p.id], partGrades[p.id]))
    const graded = verdicts.filter((v) => v !== 'ungraded')
    if (graded.length === 0) return 'ungraded'
    if (graded.every((v) => v === 'correct')) return 'correct'
    if (graded.every((v) => v === 'incorrect')) return 'incorrect'
    return 'partial'
  }
  const base = getVerdict(question, value)
  if (base === 'ungraded') {
    // Points-based self-grade (0..question.selfGradeMaxPoints) — e.g. a
    // qa_table reformulation exercise worth 3 points where the person
    // judges their own answer against the key and picks how many of
    // the 3 they think they earned.
    if (typeof selfGrade === 'number' && question.selfGradeMaxPoints > 0) {
      if (selfGrade <= 0) return 'incorrect'
      if (selfGrade >= question.selfGradeMaxPoints) return 'correct'
      return 'partial'
    }
    if (selfGrade === 'correct' || selfGrade === 'incorrect') return selfGrade
  }
  return base
}

export function getVerdict(question, value) {
  if (!hasAnswer(question, value)) return null

  switch (question.type) {
    case 'numeric':
      return gradeNumeric(value, question.correctValue, question.tolerance ?? 0.1)

    case 'short_answer':
      return gradeShortAnswer(value, question.acceptedAnswers)

    case 'true_false': {
      const total = question.statements.length
      const correctCount = question.statements.filter((s) => value[s.id] === (s.correct ? 'true' : 'false')).length
      if (correctCount === total) return 'correct'
      if (correctCount === 0) return 'incorrect'
      return 'partial'
    }

    case 'heading_match': {
      const normalize = (s) => s.split(',').map((x) => x.trim().toUpperCase()).filter(Boolean)
      const given = normalize(value)
      const correct = normalize(question.correctSequence)
      if (given.length !== correct.length) {
        // Still give partial credit for however many positions happen to match.
        const matches = given.filter((letter, i) => letter === correct[i]).length
        return matches === 0 ? 'incorrect' : 'partial'
      }
      const matches = given.filter((letter, i) => letter === correct[i]).length
      if (matches === correct.length) return 'correct'
      return matches === 0 ? 'incorrect' : 'partial'
    }

    case 'free_text':
      return 'ungraded'

    case 'essay_choice':
      return 'ungraded'

    case 'multi_part': {
      const verdicts = question.parts.map((p) => getVerdictForPart(p, value[p.id]))
      // free_text parts are never auto-graded — they shouldn't drag an
      // otherwise-all-correct question down to "partial" just for
      // existing. Base the aggregate purely on the auto-graded parts.
      const graded = verdicts.filter((v) => v !== 'ungraded')
      if (graded.length === 0) return 'ungraded'
      if (graded.every((v) => v === 'correct')) return 'correct'
      if (graded.every((v) => v === 'incorrect')) return 'incorrect'
      return 'partial'
    }

    case 'cloze': {
      const ids = clozeBlankIds(question.cloze.template)
      const correctCount = ids.filter((id) => getVerdictForBlank(question, id, value) === 'correct').length
      if (correctCount === ids.length) return 'correct'
      if (correctCount === 0) return 'incorrect'
      return 'partial'
    }

    case 'qa_table': {
      const rows = qaTableScoredRows(question.qaTable)
      if (rows.length === 0) return 'ungraded'
      const correctCount = rows.filter((r) => getVerdictForRow(r, value) === 'correct').length
      if (correctCount === rows.length) return 'correct'
      if (correctCount === 0) return 'incorrect'
      return 'partial'
    }

    case 'tf_table': {
      const rows = tfTableGradableRows(question.tfTable)
      const correctCount = rows.filter((r) => getVerdictForTfRow(r, value[r.id]) === 'correct').length
      if (correctCount === rows.length) return 'correct'
      if (correctCount === 0) return 'incorrect'
      return 'partial'
    }

    case 'multiple_choice':
    default: {
      const correct = new Set(question.correctOptionIds)
      const selected = new Set(value)
      const hasAllCorrect = [...correct].every((id) => selected.has(id))
      const hasOnlyCorrect = [...selected].every((id) => correct.has(id))
      if (hasAllCorrect && hasOnlyCorrect) return 'correct'
      const overlaps = [...selected].some((id) => correct.has(id))
      return overlaps ? 'partial' : 'incorrect'
    }
  }
}
