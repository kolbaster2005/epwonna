import { useEffect, useState } from 'react'
import { useNavigate, useParams, useSearchParams, Link } from 'react-router-dom'
import { exams } from '../../data/examData.js'
import { getTest, createTest, updateTest, listTaskShareCounts } from '../../services/testsService.js'
import { pluralizeRu } from '../../utils/pluralize.js'
import { listTopics, listTaskTopicsFor, setTaskTopics } from '../../services/topicsService.js'
import PageLoader from '../../components/PageLoader.jsx'
import { useDialog } from '../../contexts/DialogContext.jsx'
import { listExamParts } from '../../services/examPartsService.js'
import { clozeBlankIds } from '../../utils/grading.js'

function uid(prefix) {
  return `${prefix}-${Math.random().toString(36).slice(2, 8)}`
}

// Sentinel for "no category set" — every question/passage falls into
// exactly one exam part, or this fallback bucket, so nothing
// can end up permanently hidden from the section picker below.
const UNSECTIONED = '__none__'
function sectionKeyOf(item) {
  return item.category || UNSECTIONED
}

function blankQuestion() {
  return {
    id: uid('q'),
    text: '',
    image: undefined,
    explanation: '',
    type: 'multiple_choice',
    options: [
      { id: uid('opt'), text: '' },
      { id: uid('opt'), text: '' },
    ],
    correctOptionIds: [],
  }
}

// Type-specific defaults, keyed by question.type. Used both when a fresh
// question is created and when the admin switches an existing question's
// type — common fields (text/image/explanation/category) survive the
// switch, type-specific ones (options, correctValue, statements…) reset.
function defaultsForType(type) {
  switch (type) {
    case 'numeric':
      return { correctValue: 0, tolerance: 0.1, unit: '' }
    case 'true_false':
      return {
        statements: [
          { id: uid('st'), text: '', correct: true },
          { id: uid('st'), text: '', correct: false },
        ],
      }
    case 'heading_match':
      return { correctSequence: '' }
    case 'short_answer':
      return { acceptedAnswers: [''] }
    case 'cloze':
      return { cloze: { template: '', blanks: {} } }
    case 'qa_table':
      return {
        qaTable: {
          rows: [
            { id: uid('row'), prompt: '', given: '' },
            { id: uid('row'), prompt: '', acceptedAnswers: [''] },
          ],
        },
      }
    case 'tf_table':
      return {
        tfTable: {
          rows: [
            { id: uid('row'), statement: '', correct: false, words: ['', '', '', ''], isExample: true },
            { id: uid('row'), statement: '', correct: true, words: ['', '', '', ''] },
          ],
        },
      }
    case 'essay_choice':
      return {
        essayChoice: {
          options: [blankEssayOption('a'), blankEssayOption('b')],
        },
      }
    case 'free_text':
      return {}
    case 'multi_part':
      return { parts: [blankPart('numeric')] }
    case 'multiple_choice':
    default:
      return {
        options: [
          { id: uid('opt'), text: '' },
          { id: uid('opt'), text: '' },
        ],
        correctOptionIds: [],
      }
  }
}

// A blank prompt for essay_choice — title + optional image/excerpt text +
// a list of numbered instructions (what the person needs to cover in
// their answer).
function blankEssayOption(id) {
  return { id, title: '', image: '', text: '', instructions: [''] }
}

// A blank part inside a multi_part question — either a plain numeric
// sub-question, or a fillable table (2×2 to start; add rows/columns from
// the editor). Mirrors defaultsForType's job but one level down.
function blankPart(type) {
  const base = { id: uid('part'), label: '', type }
  if (type === 'table') {
    return {
      ...base,
      table: {
        columns: ['Колонка 1', 'Колонка 2'],
        rows: ['Строка 1', 'Строка 2'],
        cells: [
          [{ correctValue: 0, tolerance: 1 }, { correctValue: 0, tolerance: 1 }],
          [{ correctValue: 0, tolerance: 1 }, { correctValue: 0, tolerance: 1 }],
        ],
      },
    }
  }
  if (type === 'free_text') return base
  if (type === 'short_answer') return { ...base, acceptedAnswers: [''] }
  if (type === 'single_choice') {
    return {
      ...base,
      options: ['a', 'b', 'c'].map((id) => ({ id, text: '' })),
      correctOptionId: 'a',
    }
  }
  return { ...base, correctValue: 0, tolerance: 0.1, unit: '' }
}

function blankTest(exam, preferredFormat) {
  return {
    title: '',
    shortDescription: '',
    fullDescription: '',
    isOfficial: true,
    isModel: false,
    isPinned: false,
    topic: '',
    format: hasPhases(exam) ? preferredFormat || exam.phases[0].value : undefined,
    year: new Date().getFullYear(),
    durationMinutes: 60,
    questions: [],
    passages: [],
    oralTask: null,
    pdfUrl: undefined,
    pdfFileName: undefined,
  }
}

// A blank устная часть — one stage to start, with one option. Mirrors
// the shape OralTestPage.jsx expects (see the comment at the top of
// that file): stage.kind 'choice' means "pick one of `options`, then
// prep/present it" — the only kind actually used by any real content
// so far, and the only one this editor supports.
function blankOralTask() {
  return { stages: [] }
}

function blankOralOption() {
  return { id: uid('opt'), label: '', kind: 'image', image: '', content: '', leitfragen: [''] }
}

function blankOralStage() {
  return {
    id: uid('stage'),
    title: '',
    kind: 'choice',
    instructions: '',
    prepMinutes: 15,
    options: [blankOralOption()],
  }
}

function hasPhases(exam) {
  return Boolean(exam.phases)
}

export default function AdminTestEditor({ examKey }) {
  const { testId } = useParams()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const exam = exams[examKey]
  const isNew = !testId
  const { confirm } = useDialog()

  const [form, setForm] = useState(null) // null = loading (edit mode only)
  const [topics, setTopics] = useState([])
  const [examParts, setExamParts] = useState([])
  const [shareCounts, setShareCounts] = useState({}) // task_id -> сколько тестов его сейчас используют
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  // null = showing the section picker (Чтение / Аудирование / ...); once
  // set, only that section's texts+questions are shown/editable. Keeps
  // the editor from dumping every text and every question from every
  // part of the exam onto one screen at once.
  const [activeSection, setActiveSection] = useState(null)

  useEffect(() => {
    setActiveSection(null)
  }, [testId])

  useEffect(() => {
    if (isNew) {
      setForm(blankTest(exam, searchParams.get('format')))
    } else {
      setForm(null)
      getTest(examKey, testId).then(async (data) => {
        if (!data) {
          setForm(blankTest(exam))
          return
        }
        const ids = (data.questions || []).map((q) => q.id)
        const [topicsMap, shares] = await Promise.all([listTaskTopicsFor(ids), listTaskShareCounts(ids)])
        setShareCounts(shares)
        setForm({
          ...data,
          questions: data.questions.map((q) => ({ ...q, topicIds: topicsMap[q.id] || [] })),
        })
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [examKey, testId, isNew])

  useEffect(() => {
    listTopics(examKey).then((list) => {
      setTopics(list)
      setForm((f) => (f && isNew && !f.topic && list[0] ? { ...f, topic: list[0].id } : f))
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [examKey])

  useEffect(() => {
    listExamParts(examKey).then(setExamParts)
  }, [examKey])

  // If the format is switched to "устная часть" (or an existing test
  // somehow has none), make sure there's always a real oralTask object
  // to edit against, instead of every stage-management function having
  // to null-check it individually.
  useEffect(() => {
    if (form && form.format === 'oral' && !form.oralTask) {
      setForm((f) => ({ ...f, oralTask: blankOralTask() }))
    }
  }, [form?.format, form?.oralTask])

  if (!form) {
    return <PageLoader />
  }

  // Sections used to come from the hardcoded exam.categories array —
  // now from the real, admin-editable exam_parts table (see "Части
  // экзамена" link above). The section *key* is still the label text
  // itself (not exam_parts.id, which is a slug) — every existing
  // question's `category` was already saved as that exact label, so
  // keeping the key as the label means nothing already-entered content
  // needs migrating for this to keep working. Falls back to the old
  // hardcoded list while exam_parts hasn't loaded yet (or is genuinely
  // empty), so the editor never briefly shows zero sections.
  // Only meaningful for written tests; oral tests use a completely
  // different content model (oral_task.stages).
  const sectionSource = examParts.length > 0 ? examParts.map((p) => ({ value: p.label, label: p.label })) : exam.categories
  const sections =
    sectionSource && form.format !== 'oral'
      ? [...sectionSource.map((c) => ({ key: c.value, label: c.label })), { key: UNSECTIONED, label: 'Без раздела' }]
      : null

  function questionsInSection(key) {
    return form.questions.filter((q) => sectionKeyOf(q) === key)
  }
  function passagesInSection(key) {
    return (form.passages || []).filter((p) => sectionKeyOf(p) === key)
  }

  function setField(key, value) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  // ---- Oral task (устная часть): stages[].options[] --------------------

  function updateStages(updater) {
    setForm((f) => ({ ...f, oralTask: { ...(f.oralTask || blankOralTask()), stages: updater(f.oralTask?.stages || []) } }))
  }

  function addStage() {
    updateStages((stages) => [...stages, blankOralStage()])
  }
  function removeStage(stageIndex) {
    updateStages((stages) => stages.filter((_, i) => i !== stageIndex))
  }
  function setStage(stageIndex, patch) {
    updateStages((stages) => stages.map((s, i) => (i === stageIndex ? { ...s, ...patch } : s)))
  }

  function updateOptions(stageIndex, updater) {
    updateStages((stages) => stages.map((s, i) => (i === stageIndex ? { ...s, options: updater(s.options || []) } : s)))
  }
  function addOralOption(stageIndex) {
    updateOptions(stageIndex, (options) => [...options, blankOralOption()])
  }
  function removeOralOption(stageIndex, optIndex) {
    updateOptions(stageIndex, (options) => options.filter((_, i) => i !== optIndex))
  }
  function setOption(stageIndex, optIndex, patch) {
    updateOptions(stageIndex, (options) => options.map((o, i) => (i === optIndex ? { ...o, ...patch } : o)))
  }

  // Same data:-URI-on-the-spot approach as handleImageChange below, for
  // an option's stimulus photo (Bildimpuls, Grafik, Karikatur, ...).
  function handleOptionImageChange(stageIndex, optIndex, file) {
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => setOption(stageIndex, optIndex, { image: reader.result, kind: 'image' })
    reader.readAsDataURL(file)
  }

  function setLeitfrage(stageIndex, optIndex, lfIndex, text) {
    updateOptions(stageIndex, (options) =>
      options.map((o, i) => {
        if (i !== optIndex) return o
        const leitfragen = [...(o.leitfragen || [])]
        leitfragen[lfIndex] = text
        return { ...o, leitfragen }
      })
    )
  }
  function addLeitfrage(stageIndex, optIndex) {
    updateOptions(stageIndex, (options) =>
      options.map((o, i) => (i === optIndex ? { ...o, leitfragen: [...(o.leitfragen || []), ''] } : o))
    )
  }
  function removeLeitfrage(stageIndex, optIndex, lfIndex) {
    updateOptions(stageIndex, (options) =>
      options.map((o, i) =>
        i === optIndex ? { ...o, leitfragen: (o.leitfragen || []).filter((_, k) => k !== lfIndex) } : o
      )
    )
  }

  // ---- Reading/listening passages (shared across several questions via
  // question.passageId — see the schema.sql comment on tests.passages) --

  function addPassage(category) {
    setForm((f) => ({
      ...f,
      passages: [...(f.passages || []), { id: uid('passage'), title: '', text: '', category }],
    }))
  }

  function setPassage(passageIndex, patch) {
    setForm((f) => ({
      ...f,
      passages: f.passages.map((p, i) => (i === passageIndex ? { ...p, ...patch } : p)),
    }))
  }

  function removePassage(passageIndex) {
    setForm((f) => {
      const removedId = f.passages[passageIndex]?.id
      return {
        ...f,
        passages: f.passages.filter((_, i) => i !== passageIndex),
        // Questions pointing at the removed passage fall back to "no
        // passage" instead of silently referencing a dangling id.
        questions: f.questions.map((q) => (q.passageId === removedId ? { ...q, passageId: undefined } : q)),
      }
    })
  }

  // ---- cloze: template text with inline {1} {2} ... markers --------------
  // The set of blanks is derived from the template itself (clozeBlankIds),
  // not authored separately — typing {3} in the text is what creates
  // "blank 3"; deleting it removes that blank's answer field too, so the
  // two can never drift out of sync.

  function setClozeTemplate(qIndex, template) {
    setForm((f) => ({
      ...f,
      questions: f.questions.map((q, i) => {
        if (i !== qIndex) return q
        const ids = clozeBlankIds(template)
        const blanks = {}
        ids.forEach((id) => {
          blanks[id] = q.cloze.blanks[id] || { acceptedAnswers: [''] }
        })
        return { ...q, cloze: { template, blanks } }
      }),
    }))
  }

  function setClozeBlankAnswers(qIndex, blankId, acceptedAnswers) {
    setForm((f) => ({
      ...f,
      questions: f.questions.map((q, i) =>
        i !== qIndex
          ? q
          : { ...q, cloze: { ...q.cloze, blanks: { ...q.cloze.blanks, [blankId]: { acceptedAnswers } } } }
      ),
    }))
  }

  const blankChoiceOptions = () => ['a', 'b', 'c', 'd'].map((id) => ({ id, text: '' }))

  // Switches a blank between "Текст" (acceptedAnswers) and "Выбор из
  // вариантов" (4 fixed a-d options) — resets that blank's fields to a
  // blank version of the new shape, same idea as the multi_part / table
  // type-switchers elsewhere in this file.
  function setClozeBlankType(qIndex, blankId, type) {
    setForm((f) => ({
      ...f,
      questions: f.questions.map((q, i) => {
        if (i !== qIndex) return q
        const blank =
          type === 'choice' ? { type: 'choice', options: blankChoiceOptions(), correctOptionId: 'a' } : { acceptedAnswers: [''] }
        return { ...q, cloze: { ...q.cloze, blanks: { ...q.cloze.blanks, [blankId]: blank } } }
      }),
    }))
  }

  function setClozeChoiceOptionText(qIndex, blankId, optionId, text) {
    setForm((f) => ({
      ...f,
      questions: f.questions.map((q, i) => {
        if (i !== qIndex) return q
        const blank = q.cloze.blanks[blankId]
        const options = blank.options.map((o) => (o.id === optionId ? { ...o, text } : o))
        return { ...q, cloze: { ...q.cloze, blanks: { ...q.cloze.blanks, [blankId]: { ...blank, options } } } }
      }),
    }))
  }

  function setClozeChoiceCorrect(qIndex, blankId, correctOptionId) {
    setForm((f) => ({
      ...f,
      questions: f.questions.map((q, i) =>
        i !== qIndex
          ? q
          : { ...q, cloze: { ...q.cloze, blanks: { ...q.cloze.blanks, [blankId]: { ...q.cloze.blanks[blankId], correctOptionId } } } }
      ),
    }))
  }

  // The reference table's "(0)" worked-example row — not a real blank in
  // the template (the word is just written directly in the text), just
  // metadata for the options table shown above the paragraph.
  function toggleClozeExample(qIndex) {
    setForm((f) => ({
      ...f,
      questions: f.questions.map((q, i) => {
        if (i !== qIndex) return q
        if (q.cloze.exampleChoice) {
          const { exampleChoice, ...rest } = q.cloze
          return { ...q, cloze: rest }
        }
        return { ...q, cloze: { ...q.cloze, exampleChoice: { label: '0', options: blankChoiceOptions(), correctOptionId: 'a' } } }
      }),
    }))
  }

  function setClozeExampleOptionText(qIndex, optionId, text) {
    setForm((f) => ({
      ...f,
      questions: f.questions.map((q, i) => {
        if (i !== qIndex) return q
        const options = q.cloze.exampleChoice.options.map((o) => (o.id === optionId ? { ...o, text } : o))
        return { ...q, cloze: { ...q.cloze, exampleChoice: { ...q.cloze.exampleChoice, options } } }
      }),
    }))
  }

  function setClozeExampleCorrect(qIndex, correctOptionId) {
    setForm((f) => ({
      ...f,
      questions: f.questions.map((q, i) =>
        i !== qIndex ? q : { ...q, cloze: { ...q.cloze, exampleChoice: { ...q.cloze.exampleChoice, correctOptionId } } }
      ),
    }))
  }

  // ---- qa_table: 2-column table rows --------------------------------------

  function updateQaRows(qIndex, updater) {
    setForm((f) => ({
      ...f,
      questions: f.questions.map((q, i) => (i !== qIndex ? q : { ...q, qaTable: { rows: updater(q.qaTable.rows) } })),
    }))
  }

  function addQaRow(qIndex) {
    updateQaRows(qIndex, (rows) => [...rows, { id: uid('row'), prompt: '', acceptedAnswers: [''] }])
  }

  function removeQaRow(qIndex, rowIndex) {
    updateQaRows(qIndex, (rows) => (rows.length <= 1 ? rows : rows.filter((_, i) => i !== rowIndex)))
  }

  function setQaRow(qIndex, rowIndex, patch) {
    updateQaRows(qIndex, (rows) => rows.map((r, i) => (i === rowIndex ? { ...r, ...patch } : r)))
  }

  // Flips a row between "пример" (given, pre-filled, not graded) and
  // "проверяемая" (acceptedAnswers) — same idea as the table part's
  // given/blank cell toggle.
  // Switches a row between "Пример" (given), "Короткий ответ"
  // (acceptedAnswers, exact-match graded) and "Свободный ответ"
  // (freeText — a whole rewritten/continued sentence, never graded).
  function setQaRowType(qIndex, rowIndex, type) {
    updateQaRows(qIndex, (rows) =>
      rows.map((r, i) => {
        if (i !== rowIndex) return r
        const { id, prompt, points, after } = r
        const base = { id, prompt, points, after }
        if (type === 'given') return { ...base, given: '' }
        if (type === 'freeText') return { ...base, freeText: true }
        return { ...base, acceptedAnswers: [''] }
      })
    )
  }

  // ---- tf_table: richtig/falsch + 4-word evidence rows --------------------

  function updateTfRows(qIndex, updater) {
    setForm((f) => ({
      ...f,
      questions: f.questions.map((q, i) => (i !== qIndex ? q : { ...q, tfTable: { rows: updater(q.tfTable.rows) } })),
    }))
  }

  function addTfRow(qIndex) {
    updateTfRows(qIndex, (rows) => [...rows, { id: uid('row'), statement: '', correct: true, words: ['', '', '', ''] }])
  }

  function removeTfRow(qIndex, rowIndex) {
    updateTfRows(qIndex, (rows) => (rows.length <= 1 ? rows : rows.filter((_, i) => i !== rowIndex)))
  }

  function setTfRow(qIndex, rowIndex, patch) {
    updateTfRows(qIndex, (rows) => rows.map((r, i) => (i === rowIndex ? { ...r, ...patch } : r)))
  }

  function setTfRowWord(qIndex, rowIndex, wordIndex, text) {
    updateTfRows(qIndex, (rows) =>
      rows.map((r, i) => {
        if (i !== rowIndex) return r
        const words = [...r.words]
        words[wordIndex] = text
        return { ...r, words }
      })
    )
  }

  function setQuestion(qIndex, patch) {
    setForm((f) => ({
      ...f,
      questions: f.questions.map((q, i) => (i === qIndex ? { ...q, ...patch } : q)),
    }))
  }

  function setInstruction(qIndex, index, text) {
    setForm((f) => ({
      ...f,
      questions: f.questions.map((q, i) =>
        i !== qIndex ? q : { ...q, instructions: (q.instructions || []).map((line, j) => (j === index ? text : line)) }
      ),
    }))
  }

  function addInstruction(qIndex) {
    setForm((f) => ({
      ...f,
      questions: f.questions.map((q, i) => (i !== qIndex ? q : { ...q, instructions: [...(q.instructions || []), ''] })),
    }))
  }

  function removeInstruction(qIndex, index) {
    setForm((f) => ({
      ...f,
      questions: f.questions.map((q, i) =>
        i !== qIndex ? q : { ...q, instructions: (q.instructions || []).filter((_, j) => j !== index) }
      ),
    }))
  }

  function setQuestionType(qIndex, type) {
    setForm((f) => ({
      ...f,
      questions: f.questions.map((q, i) => {
        if (i !== qIndex) return q
        const { id, text, image, explanation, category, taskType, selfGradeMaxPoints, topicIds, sourceUrl, contentId, instructions } = q
        return { id, text, image, explanation, category, taskType, selfGradeMaxPoints, topicIds, sourceUrl, contentId, instructions, type, ...defaultsForType(type) }
      }),
    }))
  }

  function addQuestion(category) {
    setForm((f) => ({ ...f, questions: [...f.questions, { ...blankQuestion(), category }] }))
  }

  async function removeQuestion(qIndex) {
    if (!(await confirm('Удалить этот вопрос?'))) return
    setForm((f) => ({ ...f, questions: f.questions.filter((_, i) => i !== qIndex) }))
  }

  function addOption(qIndex) {
    setForm((f) => ({
      ...f,
      questions: f.questions.map((q, i) => {
        if (i !== qIndex) return q
        if (q.options.length >= 6) return q
        return { ...q, options: [...q.options, { id: uid('opt'), text: '' }] }
      }),
    }))
  }

  function removeOption(qIndex, optionId) {
    setForm((f) => ({
      ...f,
      questions: f.questions.map((q, i) => {
        if (i !== qIndex) return q
        if (q.options.length <= 2) return q
        return {
          ...q,
          options: q.options.filter((o) => o.id !== optionId),
          correctOptionIds: q.correctOptionIds.filter((id) => id !== optionId),
        }
      }),
    }))
  }

  function setOptionText(qIndex, optionId, text) {
    setForm((f) => ({
      ...f,
      questions: f.questions.map((q, i) =>
        i === qIndex ? { ...q, options: q.options.map((o) => (o.id === optionId ? { ...o, text } : o)) } : q
      ),
    }))
  }

  function toggleCorrect(qIndex, optionId) {
    setForm((f) => ({
      ...f,
      questions: f.questions.map((q, i) => {
        if (i !== qIndex) return q
        const has = q.correctOptionIds.includes(optionId)
        return { ...q, correctOptionIds: has ? q.correctOptionIds.filter((id) => id !== optionId) : [...q.correctOptionIds, optionId] }
      }),
    }))
  }

  function addStatement(qIndex) {
    setForm((f) => ({
      ...f,
      questions: f.questions.map((q, i) => {
        if (i !== qIndex) return q
        if (q.statements.length >= 6) return q
        return { ...q, statements: [...q.statements, { id: uid('st'), text: '', correct: true }] }
      }),
    }))
  }

  function removeStatement(qIndex, stId) {
    setForm((f) => ({
      ...f,
      questions: f.questions.map((q, i) => {
        if (i !== qIndex) return q
        if (q.statements.length <= 2) return q
        return { ...q, statements: q.statements.filter((s) => s.id !== stId) }
      }),
    }))
  }

  function setStatementText(qIndex, stId, text) {
    setForm((f) => ({
      ...f,
      questions: f.questions.map((q, i) =>
        i === qIndex ? { ...q, statements: q.statements.map((s) => (s.id === stId ? { ...s, text } : s)) } : q
      ),
    }))
  }

  function setStatementCorrect(qIndex, stId, correct) {
    setForm((f) => ({
      ...f,
      questions: f.questions.map((q, i) =>
        i === qIndex ? { ...q, statements: q.statements.map((s) => (s.id === stId ? { ...s, correct } : s)) } : q
      ),
    }))
  }

  // ---- multi_part: parts (numeric / table) ------------------------------

  function setPart(qIndex, partIndex, patch) {
    setForm((f) => ({
      ...f,
      questions: f.questions.map((q, i) =>
        i !== qIndex ? q : { ...q, parts: q.parts.map((p, j) => (j === partIndex ? { ...p, ...patch } : p)) }
      ),
    }))
  }

  function setPartType(qIndex, partIndex, type) {
    setForm((f) => ({
      ...f,
      questions: f.questions.map((q, i) =>
        i !== qIndex
          ? q
          : {
              ...q,
              parts: q.parts.map((p, j) =>
                j === partIndex ? { ...blankPart(type), id: p.id, label: p.label, isExample: p.isExample } : p
              ),
            }
      ),
    }))
  }

  function setPartOptionText(qIndex, partIndex, optionId, text) {
    setForm((f) => ({
      ...f,
      questions: f.questions.map((q, i) => {
        if (i !== qIndex) return q
        return {
          ...q,
          parts: q.parts.map((p, j) =>
            j === partIndex ? { ...p, options: p.options.map((o) => (o.id === optionId ? { ...o, text } : o)) } : p
          ),
        }
      }),
    }))
  }

  function addPart(qIndex, type) {
    setForm((f) => ({
      ...f,
      questions: f.questions.map((q, i) => (i === qIndex ? { ...q, parts: [...q.parts, blankPart(type)] } : q)),
    }))
  }

  function removePart(qIndex, partIndex) {
    setForm((f) => ({
      ...f,
      questions: f.questions.map((q, i) => {
        if (i !== qIndex || q.parts.length <= 1) return q
        return { ...q, parts: q.parts.filter((_, j) => j !== partIndex) }
      }),
    }))
  }

  // ---- multi_part → table part: rows / columns / cells -------------------
  // All go through this one updater — every table edit is "replace the
  // table object of parts[partIndex] with updater(currentTable)".

  function updateTable(qIndex, partIndex, updater) {
    setForm((f) => ({
      ...f,
      questions: f.questions.map((q, i) =>
        i !== qIndex
          ? q
          : {
              ...q,
              parts: q.parts.map((p, j) => (j === partIndex ? { ...p, table: updater(p.table) } : p)),
            }
      ),
    }))
  }

  function addTableColumn(qIndex, partIndex) {
    updateTable(qIndex, partIndex, (table) => ({
      columns: [...table.columns, `Колонка ${table.columns.length + 1}`],
      rows: table.rows,
      cells: table.cells.map((row) => [...row, { correctValue: 0, tolerance: 1 }]),
    }))
  }

  function removeTableColumn(qIndex, partIndex, colIndex) {
    updateTable(qIndex, partIndex, (table) => {
      if (table.columns.length <= 1) return table
      return {
        columns: table.columns.filter((_, i) => i !== colIndex),
        rows: table.rows,
        cells: table.cells.map((row) => row.filter((_, i) => i !== colIndex)),
      }
    })
  }

  function addTableRow(qIndex, partIndex) {
    updateTable(qIndex, partIndex, (table) => ({
      columns: table.columns,
      rows: [...table.rows, `Строка ${table.rows.length + 1}`],
      cells: [...table.cells, table.columns.map(() => ({ correctValue: 0, tolerance: 1 }))],
    }))
  }

  function removeTableRow(qIndex, partIndex, rowIndex) {
    updateTable(qIndex, partIndex, (table) => {
      if (table.rows.length <= 1) return table
      return {
        columns: table.columns,
        rows: table.rows.filter((_, i) => i !== rowIndex),
        cells: table.cells.filter((_, i) => i !== rowIndex),
      }
    })
  }

  function setTableColumnLabel(qIndex, partIndex, colIndex, label) {
    updateTable(qIndex, partIndex, (table) => ({
      ...table,
      columns: table.columns.map((c, i) => (i === colIndex ? label : c)),
    }))
  }

  function setTableRowLabel(qIndex, partIndex, rowIndex, label) {
    updateTable(qIndex, partIndex, (table) => ({
      ...table,
      rows: table.rows.map((r, i) => (i === rowIndex ? label : r)),
    }))
  }

  function setTableCell(qIndex, partIndex, r, c, patch) {
    updateTable(qIndex, partIndex, (table) => ({
      ...table,
      cells: table.cells.map((row, ri) => (ri !== r ? row : row.map((cell, ci) => (ci === c ? { ...cell, ...patch } : cell)))),
    }))
  }

  // Flips a cell between "дано" (fixed, shown as text) and "пусто"
  // (blank input the student fills in) — resets whichever fields don't
  // apply to the new state.
  function toggleTableCellGiven(qIndex, partIndex, r, c) {
    updateTable(qIndex, partIndex, (table) => ({
      ...table,
      cells: table.cells.map((row, ri) =>
        ri !== r
          ? row
          : row.map((cell, ci) => {
              if (ci !== c) return cell
              return cell.given !== undefined ? { correctValue: 0, tolerance: 1 } : { given: 0 }
            })
      ),
    }))
  }

  // ---- essay_choice: two prompts (title, image/excerpt, instructions) ----

  function setEssayOption(qIndex, optionIndex, patch) {
    setForm((f) => ({
      ...f,
      questions: f.questions.map((q, i) =>
        i !== qIndex
          ? q
          : { ...q, essayChoice: { options: q.essayChoice.options.map((o, j) => (j === optionIndex ? { ...o, ...patch } : o)) } }
      ),
    }))
  }

  function addEssayOption(qIndex) {
    setForm((f) => ({
      ...f,
      questions: f.questions.map((q, i) =>
        i !== qIndex ? q : { ...q, essayChoice: { options: [...q.essayChoice.options, blankEssayOption(uid('topic'))] } }
      ),
    }))
  }

  function removeEssayOption(qIndex, optionIndex) {
    setForm((f) => ({
      ...f,
      questions: f.questions.map((q, i) => {
        if (i !== qIndex) return q
        if (q.essayChoice.options.length <= 1) return q
        return { ...q, essayChoice: { options: q.essayChoice.options.filter((_, j) => j !== optionIndex) } }
      }),
    }))
  }

  function setEssayInstruction(qIndex, optionIndex, instrIndex, text) {
    setForm((f) => ({
      ...f,
      questions: f.questions.map((q, i) => {
        if (i !== qIndex) return q
        return {
          ...q,
          essayChoice: {
            options: q.essayChoice.options.map((o, j) => {
              if (j !== optionIndex) return o
              const instructions = o.instructions.map((line, k) => (k === instrIndex ? text : line))
              return { ...o, instructions }
            }),
          },
        }
      }),
    }))
  }

  function addEssayInstruction(qIndex, optionIndex) {
    setEssayOption(qIndex, optionIndex, {
      instructions: [...form.questions[qIndex].essayChoice.options[optionIndex].instructions, ''],
    })
  }

  function removeEssayInstruction(qIndex, optionIndex, instrIndex) {
    const current = form.questions[qIndex].essayChoice.options[optionIndex].instructions
    if (current.length <= 1) return
    setEssayOption(qIndex, optionIndex, { instructions: current.filter((_, k) => k !== instrIndex) })
  }

  function handleEssayOptionImageChange(qIndex, optionIndex, file) {
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => setEssayOption(qIndex, optionIndex, { image: reader.result })
    reader.readAsDataURL(file)
  }

  function handleImageChange(qIndex, file) {
    if (!file) return
    // Mock-only: reads the file straight into a data: URI so the photo
    // shows up immediately with zero backend. Once Supabase Storage is
    // wired up, this becomes an upload call that returns a real URL.
    const reader = new FileReader()
    reader.onload = () => setQuestion(qIndex, { image: reader.result })
    reader.readAsDataURL(file)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    setSaveError('')
    const payload = {
      ...form,
      durationMinutes: Number(form.durationMinutes) || 0,
      year: Number(form.year) || new Date().getFullYear(),
    }
    try {
      if (isNew) {
        await createTest(examKey, payload)
      } else {
        await updateTest(examKey, testId, payload)
      }
      // task_topics is a separate table, keyed by question id — and
      // every save above just deleted+re-inserted every question row
      // (cascading away any task_topics that pointed at the old rows),
      // so this has to run after, syncing against the now-current ids.
      await Promise.all(
        (payload.questions || []).map((q) => setTaskTopics(q.id, q.topicIds || []).catch(() => {}))
      )
      navigate(`/admin/${examKey}`)
    } catch (err) {
      setSaveError(err.message || 'Не удалось сохранить пробник. Проверьте подключение к базе данных.')
      setSaving(false)
    }
  }

  return (
    <div className="admin-page">
      <Link className="admin-back" to={`/admin/${examKey}`}>← {exam.label} — пробники</Link>

      <form className="admin-form" onSubmit={handleSubmit}>
        <div className="admin-header">
          <h1>{isNew ? 'Новый пробник' : 'Редактирование пробника'}</h1>
        </div>

        <div className="admin-fieldset">
          <label className="admin-field">
            <span>Название</span>
            <input required value={form.title} onChange={(e) => setField('title', e.target.value)} placeholder="Например: Пробник 2027, март" />
          </label>

          <label className="admin-field">
            <span>Краткое описание <em>(на карточке пробника)</em></span>
            <textarea required rows={2} value={form.shortDescription} onChange={(e) => setField('shortDescription', e.target.value)} />
          </label>

          <label className="admin-field">
            <span>Полное описание <em>(на странице пробника перед стартом)</em></span>
            <textarea required rows={3} value={form.fullDescription} onChange={(e) => setField('fullDescription', e.target.value)} />
          </label>

          <div className="admin-field-row">
            <label className="admin-field">
              <span>Минут на прохождение</span>
              <input type="number" min="1" required value={form.durationMinutes} onChange={(e) => setField('durationMinutes', e.target.value)} />
            </label>

            <label className="admin-field">
              <span>Тип пробника</span>
              <select value={form.isOfficial ? 'true' : 'false'} onChange={(e) => setField('isOfficial', e.target.value === 'true')}>
                <option value="true">Официальный</option>
                <option value="false">Неофициальный</option>
              </select>
            </label>

            <label className="admin-part-example-toggle">
              <input type="checkbox" checked={!!form.isModel} onChange={(e) => setField('isModel', e.target.checked)} />
              Модель экзамена <em>(не пробник — показывает формат/все варианты заданий, а не полноценную практику)</em>
            </label>

            <label className="admin-part-example-toggle">
              <input type="checkbox" checked={!!form.isPinned} onChange={(e) => setField('isPinned', e.target.checked)} />
              Закрепить <em>(всегда показывать первым в списке пробников, независимо от года)</em>
            </label>

            <label className="admin-field">
              <span>Тема</span>
              <select value={form.topic} onChange={(e) => setField('topic', e.target.value)}>
                {topics.length === 0 && <option value="">— тем пока нет —</option>}
                {topics.map((t) => (
                  <option key={t.id} value={t.id}>{t.label}</option>
                ))}
              </select>
              <Link className="admin-inline-link" to={`/admin/${examKey}/topics`}>Управлять списком тем →</Link>
            </label>

            {hasPhases(exam) && (
              <label className="admin-field">
                <span>Часть экзамена</span>
                <select value={form.format} onChange={(e) => setField('format', e.target.value)}>
                  {exam.phases.map((p) => (
                    <option key={p.value} value={p.value}>{p.label}</option>
                  ))}
                </select>
              </label>
            )}

            <label className="admin-field">
              <span>Год</span>
              <input type="number" required value={form.year} onChange={(e) => setField('year', e.target.value)} />
            </label>
          </div>

          <label className="admin-field">
            <span>Ссылка на PDF пробника <em>(необязательно — покажется как «Скачать пробник в PDF» на странице пробника; загрузите файл на Google Диск и вставьте сюда ссылку с доступом «по ссылке»)</em></span>
            <input
              type="url"
              value={form.pdfUrl || ''}
              onChange={(e) => setField('pdfUrl', e.target.value)}
              placeholder="https://drive.google.com/file/d/..."
            />
          </label>

          <p className="admin-note">
            {form.format === 'oral'
              ? 'Для устных пробников количество вопросов не считается — вместо них используются этапы устной части.'
              : <>Количество вопросов на карточке считается автоматически — сейчас в этом пробнике <b>{form.questions.length}</b>.</>}
          </p>
        </div>

        {form.format === 'oral' && (
          <div className="admin-questions">
            <h2>Устная часть</h2>
            <p className="admin-note">
              Вступительный текст (правила экзамена) один на весь экзамен и задаётся в коде
              (<code>src/data/examData.js</code> → <code>oralExamInfo</code>), а не для каждого пробника отдельно —
              ниже настраиваются только этапы и карточки этого конкретного пробника.
            </p>

            {(form.oralTask?.stages || []).map((stage, stageIndex) => (
              <div className="admin-oral-stage" key={stage.id}>
                <div className="admin-qa-row-head">
                  <span className="admin-part-index">Этап {stageIndex + 1}</span>
                  <button
                    type="button"
                    className="admin-delete-btn"
                    disabled={form.oralTask.stages.length <= 1}
                    onClick={() => removeStage(stageIndex)}
                    aria-label="Удалить этап"
                  >
                    ✕
                  </button>
                </div>

                <div className="admin-field-row">
                  <label className="admin-field">
                    <span>Название этапа</span>
                    <input
                      value={stage.title}
                      onChange={(e) => setStage(stageIndex, { title: e.target.value })}
                      placeholder="Monologischer Teil"
                    />
                  </label>
                  <label className="admin-field">
                    <span>Подготовка, минут <em>(0 — без подготовки)</em></span>
                    <input
                      type="number"
                      min="0"
                      value={stage.prepMinutes}
                      onChange={(e) => setStage(stageIndex, { prepMinutes: Number(e.target.value) })}
                    />
                  </label>
                </div>

                <label className="admin-field">
                  <span>Инструкция к этапу</span>
                  <textarea
                    rows={2}
                    value={stage.instructions}
                    onChange={(e) => setStage(stageIndex, { instructions: e.target.value })}
                    placeholder="Выберите одну из карточек и подготовьте ответ."
                  />
                </label>

                <p className="admin-note">Карточки на выбор — ученик увидит их и выберет одну.</p>

                {(stage.options || []).map((opt, optIndex) => (
                  <div className="admin-oral-option" key={opt.id}>
                    <div className="admin-qa-row-head">
                      <span className="admin-part-index">{opt.id}</span>
                      <select value={opt.kind} onChange={(e) => setOption(stageIndex, optIndex, { kind: e.target.value })}>
                        <option value="image">Картинка</option>
                        <option value="text">Текстовый отрывок</option>
                        <option value="quote">Цитата</option>
                      </select>
                      <button
                        type="button"
                        className="admin-delete-btn"
                        disabled={stage.options.length <= 1}
                        onClick={() => removeOralOption(stageIndex, optIndex)}
                        aria-label="Удалить карточку"
                      >
                        ✕
                      </button>
                    </div>

                    <label className="admin-field">
                      <span>Название карточки</span>
                      <input
                        value={opt.label}
                        onChange={(e) => setOption(stageIndex, optIndex, { label: e.target.value })}
                        placeholder="1a. Grafik"
                      />
                    </label>

                    {opt.kind === 'image' ? (
                      <label className="admin-field">
                        <span>Картинка</span>
                        {opt.image ? (
                          <div className="admin-passage-head">
                            <span className="admin-part-label-input" style={{ flex: 1 }}>Картинка загружена</span>
                            <button type="button" className="admin-delete-btn" onClick={() => setOption(stageIndex, optIndex, { image: '' })}>
                              ✕
                            </button>
                          </div>
                        ) : (
                          <input type="file" accept="image/*" onChange={(e) => handleOptionImageChange(stageIndex, optIndex, e.target.files?.[0])} />
                        )}
                      </label>
                    ) : (
                      <label className="admin-field">
                        <span>{opt.kind === 'quote' ? 'Текст цитаты' : 'Текст отрывка'}</span>
                        <textarea
                          rows={opt.kind === 'quote' ? 2 : 5}
                          value={opt.content}
                          onChange={(e) => setOption(stageIndex, optIndex, { content: e.target.value })}
                        />
                      </label>
                    )}

                    <label className="admin-field">
                      <span>Наводящие вопросы</span>
                      <div className="admin-single-choice-editor">
                        {(opt.leitfragen || []).map((line, lfIndex) => (
                          <div className="admin-single-choice-option" key={lfIndex}>
                            <span className="admin-part-index">{lfIndex + 1}</span>
                            <input
                              value={line}
                              onChange={(e) => setLeitfrage(stageIndex, optIndex, lfIndex, e.target.value)}
                              placeholder="Beschreiben Sie..."
                            />
                            <button
                              type="button"
                              className="admin-delete-btn"
                              disabled={(opt.leitfragen || []).length <= 1}
                              onClick={() => removeLeitfrage(stageIndex, optIndex, lfIndex)}
                              aria-label="Удалить вопрос"
                            >
                              ✕
                            </button>
                          </div>
                        ))}
                        <button type="button" className="admin-add-link" onClick={() => addLeitfrage(stageIndex, optIndex)}>
                          + Вопрос
                        </button>
                      </div>
                    </label>
                  </div>
                ))}

                <button type="button" className="admin-add-link" onClick={() => addOralOption(stageIndex)}>
                  + Карточка на выбор
                </button>
              </div>
            ))}

            <button type="button" className="admin-add-link" onClick={addStage}>
              + Этап устной части
            </button>
          </div>
        )}

        {sections && activeSection === null && (
          <div className="admin-sections">
            <h2>Разделы пробника</h2>
            <p className="admin-note">Выберите раздел, чтобы добавить в него тексты и вопросы.</p>
            <div className="admin-section-grid">
              {sections.map((s) => {
                const qCount = questionsInSection(s.key).length
                const pCount = passagesInSection(s.key).length
                if (s.key === UNSECTIONED && qCount === 0 && pCount === 0) return null
                return (
                  <button type="button" className="admin-section-card" key={s.key} onClick={() => setActiveSection(s.key)}>
                    <span className="admin-section-card-label">{s.label}</span>
                    <span className="admin-section-card-count">
                      {qCount} {qCount === 1 ? 'вопрос' : qCount >= 2 && qCount <= 4 ? 'вопроса' : 'вопросов'}
                      {pCount > 0 && `, ${pCount} ${pCount === 1 ? 'текст' : 'текста'}`}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {sections && activeSection !== null && (
          <>
            <div className="admin-section-bar">
              <button type="button" className="admin-back-link" onClick={() => setActiveSection(null)}>
                ← Все разделы
              </button>
              <h2>{sections.find((s) => s.key === activeSection)?.label}</h2>
            </div>

            <div className="admin-passages">
              <h3>Тексты для чтения</h3>
              <p className="admin-note">
                Общий текст (для Leseverstehen и т.п.), не привязанный ни к одному конкретному вопросу — привяжите к
                нему сколько угодно отдельных вопросов ниже через поле «Текст для чтения» у каждого вопроса. Текст
                останется на экране, пока человек отвечает на все вопросы, которые на него ссылаются.
              </p>

              {passagesInSection(activeSection).length === 0 && (
                <div className="tests-empty">Пока нет ни одного текста в этом разделе.</div>
              )}

              {form.passages.map((passage, passageIndex) => {
                if (sectionKeyOf(passage) !== activeSection) return null
                return (
                  <div className="admin-passage-card" key={passage.id}>
                    <div className="admin-passage-head">
                      <input
                        className="admin-part-label-input"
                        value={passage.title}
                        onChange={(e) => setPassage(passageIndex, { title: e.target.value })}
                        placeholder="Название текста, например: Text 1 — Internetsucht"
                      />
                      <button
                        type="button"
                        className="admin-delete-btn"
                        onClick={() => removePassage(passageIndex)}
                        aria-label="Удалить текст"
                      >
                        ✕
                      </button>
                    </div>
                    <textarea
                      rows={8}
                      value={passage.text}
                      onChange={(e) => setPassage(passageIndex, { text: e.target.value })}
                      placeholder="Сам текст для чтения…"
                    />
                  </div>
                )
              })}

              <button
                type="button"
                className="admin-add-link"
                onClick={() => addPassage(activeSection === UNSECTIONED ? undefined : activeSection)}
              >
                + Добавить текст
              </button>
            </div>

            <div className="admin-questions">
              <h3>Вопросы раздела</h3>

              {questionsInSection(activeSection).length === 0 && (
                <div className="tests-empty">Пока нет вопросов в этом разделе. Добавьте первый ниже.</div>
              )}

              {form.questions.map((q, qIndex) => {
                if (sectionKeyOf(q) !== activeSection) return null
                const sectionPassageOptions = form.passages.filter((p) => sectionKeyOf(p) === activeSection)
                return (
                  <div className="admin-question-card" key={q.id}>
                    <div className="admin-question-head">
                      <span className="admin-question-num">Вопрос {qIndex + 1}</span>
                      <button type="button" className="admin-delete-btn" onClick={() => removeQuestion(qIndex)} aria-label="Удалить вопрос">✕</button>
                    </div>

                    {shareCounts[q.id] > 1 && (
                      <p className="admin-note admin-shared-task-warning">
                        ⚠ Это задание используется ещё в {shareCounts[q.id] - 1}{' '}
                        {pluralizeRu(shareCounts[q.id] - 1, ['другом пробнике', 'других пробниках', 'других пробниках'])} —
                        изменения здесь затронут их все.
                      </p>
                    )}

                    <label className="admin-field">
                      <span>Текст вопроса <em>(перенос строки сохранится как абзац)</em></span>
                      <textarea required rows={4} value={q.text} onChange={(e) => setQuestion(qIndex, { text: e.target.value })} />
                    </label>

                    {sectionPassageOptions.length > 0 && (
                      <label className="admin-field">
                        <span>Текст для чтения <em>(необязательно — общий текст останется на экране рядом с вопросом)</em></span>
                        <select
                          value={q.passageId || ''}
                          onChange={(e) => setQuestion(qIndex, { passageId: e.target.value || undefined })}
                        >
                          <option value="">Без текста</option>
                          {sectionPassageOptions.map((p) => (
                            <option key={p.id} value={p.id}>{p.title || '(без названия)'}</option>
                          ))}
                        </select>
                      </label>
                    )}

              <label className="admin-field">
                <span>Тип ответа</span>
                <select value={q.type} onChange={(e) => setQuestionType(qIndex, e.target.value)}>
                  <option value="multiple_choice">Варианты ответа (один или несколько)</option>
                  <option value="numeric">Числовой ответ (математика, с погрешностью)</option>
                  <option value="true_false">Верно / неверно (набор утверждений)</option>
                  <option value="heading_match">Подбор заголовков (последовательность букв)</option>
                  <option value="short_answer">Короткий ответ (слово/фраза, с точным совпадением)</option>
                  <option value="cloze">Текст с пропусками (Lückentext, пропуски внутри абзаца)</option>
                  <option value="qa_table">Таблица «вопрос — короткий ответ»</option>
                  <option value="tf_table">Таблица «верно/неверно + доказательное предложение»</option>
                  <option value="essay_choice">Сочинение — выбор одной из двух тем (Schreibaufgabe)</option>
                  <option value="free_text">Свободный текст (без автопроверки)</option>
                  <option value="multi_part">Составной вопрос (несколько пунктов)</option>
                </select>
              </label>

              <label className="admin-field">
                <span>Тип задания в терминах экзамена <em>(необязательно — например «Umformung», «Blog Comment»; НЕ то же самое, что «Тип ответа» выше — это как задание отображается, а это поле — что оно тренирует)</em></span>
                <input
                  value={q.taskType || ''}
                  onChange={(e) => setQuestion(qIndex, { taskType: e.target.value })}
                  placeholder="например, Umformung"
                />
              </label>

              <label className="admin-field">
                <span>Ссылка на исходник <em>(необязательно — Google Drive; появится под вопросом как «Скачать исходник», видна только авторизованным)</em></span>
                <input
                  value={q.sourceUrl || ''}
                  onChange={(e) => setQuestion(qIndex, { sourceUrl: e.target.value })}
                  placeholder="https://drive.google.com/..."
                />
              </label>

              <div className="admin-field">
                <span>Подпункты задания <em>(необязательно — покажутся нумерованным списком 1/2/3 ПОСЛЕ картинки вопроса, отдельно от текста выше)</em></span>
                <div className="admin-single-choice-editor">
                  {(q.instructions || []).map((line, i) => (
                    <div className="admin-single-choice-option" key={i}>
                      <span className="admin-part-index">{i + 1}</span>
                      <input
                        value={line}
                        onChange={(e) => setInstruction(qIndex, i, e.target.value)}
                        placeholder="Geben Sie kurz die zentrale Aussage wieder."
                      />
                      <button type="button" className="admin-delete-btn" onClick={() => removeInstruction(qIndex, i)} aria-label="Удалить пункт">
                        ✕
                      </button>
                    </div>
                  ))}
                  <button type="button" className="admin-add-link" onClick={() => addInstruction(qIndex)}>
                    + Пункт
                  </button>
                </div>
              </div>

              {topics.length > 0 && (
                <div className="admin-field">
                  <span>Темы <em>(необязательно, можно несколько — используется для фильтра в «Банке заданий»)</em></span>
                  <div className="admin-topic-checkboxes">
                    {topics.map((t) => {
                      const checked = (q.topicIds || []).includes(t.id)
                      return (
                        <label className="admin-topic-checkbox" key={t.id}>
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={(e) => {
                              const current = q.topicIds || []
                              const next = e.target.checked ? [...current, t.id] : current.filter((id) => id !== t.id)
                              setQuestion(qIndex, { topicIds: next })
                            }}
                          />
                          {t.label}
                        </label>
                      )
                    })}
                  </div>
                </div>
              )}

              <label className="admin-field">
                <span>Пояснение <em>(необязательно — покажется под вопросом мелким серым текстом)</em></span>
                <input value={q.explanation || ''} onChange={(e) => setQuestion(qIndex, { explanation: e.target.value })} />
              </label>

              <div className="admin-field">
                <span>Фото <em>(необязательно)</em></span>
                {q.image ? (
                  <div className="admin-image-preview">
                    <img src={q.image} alt="" />
                    <button type="button" className="btn btn-outline" onClick={() => setQuestion(qIndex, { image: undefined })}>
                      Убрать фото
                    </button>
                  </div>
                ) : (
                  <input type="file" accept="image/*" onChange={(e) => handleImageChange(qIndex, e.target.files?.[0])} />
                )}
              </div>

              {q.type === 'multiple_choice' && (
                <div className="admin-options">
                  <span className="admin-options-label">
                    Варианты ответа <em>(отметьте галочкой все правильные — можно несколько)</em>
                  </span>
                  {q.options.map((opt) => (
                    <div className="admin-option-row" key={opt.id}>
                      <input
                        type="checkbox"
                        checked={q.correctOptionIds.includes(opt.id)}
                        onChange={() => toggleCorrect(qIndex, opt.id)}
                        aria-label="Правильный вариант"
                      />
                      <input
                        required
                        className="admin-option-text"
                        value={opt.text}
                        onChange={(e) => setOptionText(qIndex, opt.id, e.target.value)}
                        placeholder="Текст варианта"
                      />
                      <button
                        type="button"
                        className="admin-delete-btn"
                        disabled={q.options.length <= 2}
                        onClick={() => removeOption(qIndex, opt.id)}
                        aria-label="Удалить вариант"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                  <button type="button" className="admin-add-link" disabled={q.options.length >= 6} onClick={() => addOption(qIndex)}>
                    + Добавить вариант
                  </button>
                </div>
              )}

              {q.type === 'numeric' && (
                <div className="admin-field-row">
                  <label className="admin-field">
                    <span>Правильный ответ</span>
                    <input
                      type="number"
                      step="any"
                      required
                      value={q.correctValue}
                      onChange={(e) => setQuestion(qIndex, { correctValue: Number(e.target.value) })}
                    />
                  </label>
                  <label className="admin-field">
                    <span>Допустимая погрешность (±)</span>
                    <input
                      type="number"
                      step="any"
                      min="0"
                      required
                      value={q.tolerance}
                      onChange={(e) => setQuestion(qIndex, { tolerance: Number(e.target.value) })}
                    />
                  </label>
                  <label className="admin-field">
                    <span>Единица измерения <em>(необязательно)</em></span>
                    <input value={q.unit || ''} onChange={(e) => setQuestion(qIndex, { unit: e.target.value })} placeholder="например, см²" />
                  </label>
                </div>
              )}

              {q.type === 'true_false' && (
                <div className="admin-options">
                  <span className="admin-options-label">Утверждения <em>(отметьте, какое из них верно на самом деле)</em></span>
                  {q.statements.map((s) => (
                    <div className="admin-option-row" key={s.id}>
                      <select
                        value={s.correct ? 'true' : 'false'}
                        onChange={(e) => setStatementCorrect(qIndex, s.id, e.target.value === 'true')}
                        className="admin-tf-select"
                      >
                        <option value="true">Верно</option>
                        <option value="false">Неверно</option>
                      </select>
                      <input
                        required
                        className="admin-option-text"
                        value={s.text}
                        onChange={(e) => setStatementText(qIndex, s.id, e.target.value)}
                        placeholder="Текст утверждения"
                      />
                      <button
                        type="button"
                        className="admin-delete-btn"
                        disabled={q.statements.length <= 2}
                        onClick={() => removeStatement(qIndex, s.id)}
                        aria-label="Удалить утверждение"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                  <button type="button" className="admin-add-link" disabled={q.statements.length >= 6} onClick={() => addStatement(qIndex)}>
                    + Добавить утверждение
                  </button>
                </div>
              )}

              {q.type === 'heading_match' && (
                <label className="admin-field">
                  <span>Правильная последовательность <em>(например: A, B, C, D)</em></span>
                  <input
                    required
                    value={q.correctSequence}
                    onChange={(e) => setQuestion(qIndex, { correctSequence: e.target.value })}
                    placeholder="A, B, C, D"
                  />
                </label>
              )}

              {q.type === 'short_answer' && (
                <label className="admin-field">
                  <span>Допустимые варианты ответа <em>(через запятую, если формулировок несколько)</em></span>
                  <input
                    required
                    value={(q.acceptedAnswers || []).join(', ')}
                    onChange={(e) =>
                      setQuestion(qIndex, { acceptedAnswers: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) })
                    }
                    placeholder="bekommen, erhalten"
                  />
                </label>
              )}

              {q.type === 'cloze' && (
                <div className="admin-cloze-editor">
                  <label className="admin-field">
                    <span>
                      Текст с пропусками{' '}
                      <em>
                        (отметьте место пропуска цифрой в фигурных скобках — {'{1}'}, {'{2}'} и т.д.; пропуск
                        появится/исчезнет в списке ниже сам, по мере набора текста)
                      </em>
                    </span>
                    <textarea
                      rows={8}
                      value={q.cloze.template}
                      onChange={(e) => setClozeTemplate(qIndex, e.target.value)}
                      placeholder={'Hannelore K., eine 52-jährige Mutter von zwei Kindern, {1} im Internet das Plaudern in Chatrooms...'}
                    />
                  </label>

                  <div className="admin-field-row">
                    <label className="admin-field">
                      <span>Словарная рамка <em>(необязательно — через запятую, покажется таблицей над текстом)</em></span>
                      <input
                        value={(q.cloze.wordBank || []).join(', ')}
                        onChange={(e) =>
                          setQuestion(qIndex, {
                            cloze: { ...q.cloze, wordBank: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) },
                          })
                        }
                        placeholder="bessere, gelernt, Menschen, stärkste, ..."
                      />
                    </label>
                    <label className="admin-field">
                      <span>Уже использованные <em>(зачёркиваются в рамке — обычно слово из примера)</em></span>
                      <input
                        value={(q.cloze.usedWords || []).join(', ')}
                        onChange={(e) =>
                          setQuestion(qIndex, {
                            cloze: { ...q.cloze, usedWords: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) },
                          })
                        }
                        placeholder="bessere"
                      />
                    </label>
                  </div>

                  {Object.keys(q.cloze.blanks).length === 0 ? (
                    <p className="admin-note">
                      Пропусков пока нет — добавьте в тексте выше отметку вида {'{1}'}.
                    </p>
                  ) : (
                    <div className="admin-cloze-blanks">
                      {Object.entries(q.cloze.blanks).map(([blankId, blank]) => {
                        const isChoice = blank.type === 'choice'
                        return (
                          <div className="admin-cloze-blank-card" key={blankId}>
                            <div className="admin-qa-row-head">
                              <span className="admin-part-index">{blankId}</span>
                              <select
                                value={isChoice ? 'choice' : 'text'}
                                onChange={(e) => setClozeBlankType(qIndex, blankId, e.target.value)}
                              >
                                <option value="text">Текст</option>
                                <option value="choice">Выбор из 4 вариантов</option>
                              </select>
                            </div>

                            {isChoice ? (
                              <>
                                <div className="admin-tf-words">
                                  {blank.options.map((opt) => (
                                    <input
                                      key={opt.id}
                                      value={opt.text}
                                      onChange={(e) => setClozeChoiceOptionText(qIndex, blankId, opt.id, e.target.value)}
                                      placeholder={`${opt.id})`}
                                    />
                                  ))}
                                </div>
                                <label className="admin-field">
                                  <span>Правильный вариант</span>
                                  <select
                                    value={blank.correctOptionId}
                                    onChange={(e) => setClozeChoiceCorrect(qIndex, blankId, e.target.value)}
                                  >
                                    {blank.options.map((opt) => (
                                      <option key={opt.id} value={opt.id}>
                                        {opt.id}) {opt.text || '—'}
                                      </option>
                                    ))}
                                  </select>
                                </label>
                              </>
                            ) : (
                              <label className="admin-field">
                                <span>Допустимые ответы <em>(через запятую)</em></span>
                                <input
                                  required
                                  value={(blank.acceptedAnswers || []).join(', ')}
                                  onChange={(e) =>
                                    setClozeBlankAnswers(
                                      qIndex,
                                      blankId,
                                      e.target.value.split(',').map((s) => s.trim()).filter(Boolean)
                                    )
                                  }
                                  placeholder="entdeckte"
                                />
                              </label>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}

                  <div className="admin-cloze-example">
                    <button type="button" className="admin-add-link" onClick={() => toggleClozeExample(qIndex)}>
                      {q.cloze.exampleChoice ? '− Убрать строку-пример (0) из справочной таблицы' : '+ Добавить строку-пример (0) в справочную таблицу'}
                    </button>
                    {q.cloze.exampleChoice && (
                      <div className="admin-cloze-blank-card">
                        <div className="admin-tf-words">
                          {q.cloze.exampleChoice.options.map((opt) => (
                            <input
                              key={opt.id}
                              value={opt.text}
                              onChange={(e) => setClozeExampleOptionText(qIndex, opt.id, e.target.value)}
                              placeholder={`${opt.id})`}
                            />
                          ))}
                        </div>
                        <label className="admin-field">
                          <span>Правильный вариант</span>
                          <select
                            value={q.cloze.exampleChoice.correctOptionId}
                            onChange={(e) => setClozeExampleCorrect(qIndex, e.target.value)}
                          >
                            {q.cloze.exampleChoice.options.map((opt) => (
                              <option key={opt.id} value={opt.id}>
                                {opt.id}) {opt.text || '—'}
                              </option>
                            ))}
                          </select>
                        </label>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {(q.type === 'qa_table' || q.type === 'free_text' || q.type === 'essay_choice') && (
                <label className="admin-field">
                  <span>Баллы за задание — для самооценки <em>(необязательно; если задать, человек после ответа сам выберет, сколько баллов из этого числа он бы себе поставил, вместо простого «верно/неверно»)</em></span>
                  <input
                    type="number"
                    min="0"
                    value={q.selfGradeMaxPoints ?? ''}
                    onChange={(e) => setQuestion(qIndex, { selfGradeMaxPoints: e.target.value === '' ? undefined : Number(e.target.value) })}
                    placeholder="например, 3"
                  />
                </label>
              )}

              {q.type === 'qa_table' && (
                <div className="admin-qa-editor">
                  <p className="admin-note">
                    Слово в формулировке можно подчеркнуть, обернув его в двойное подчёркивание: <code>__слово__</code>.
                    Если хотите показать «Beispiel» фотографией из исходника вместо строки-примера — загрузите её в
                    поле «Картинка» у самого вопроса выше, а строки таблицы используйте только для проверяемых
                    пунктов.
                  </p>

                  {q.qaTable.rows.map((row, rowIndex) => {
                    const rowType = row.given !== undefined ? 'given' : row.freeText ? 'freeText' : 'short'
                    return (
                      <div className="admin-qa-row" key={row.id}>
                        <div className="admin-qa-row-head">
                          <select value={rowType} onChange={(e) => setQaRowType(qIndex, rowIndex, e.target.value)}>
                            <option value="short">Короткий ответ</option>
                            <option value="freeText">Свободный ответ (предложение)</option>
                            <option value="given">Пример</option>
                          </select>
                          <button
                            type="button"
                            className="admin-delete-btn"
                            disabled={q.qaTable.rows.length <= 1}
                            onClick={() => removeQaRow(qIndex, rowIndex)}
                            aria-label="Удалить строку"
                          >
                            ✕
                          </button>
                        </div>
                        <label className="admin-field">
                          <span>Формулировка / условие</span>
                          <textarea
                            rows={2}
                            value={row.prompt}
                            onChange={(e) => setQaRow(qIndex, rowIndex, { prompt: e.target.value })}
                            placeholder="Laut den überzeugenden Ausführungen des __renommierten Psychiaters__ …"
                          />
                        </label>

                        {rowType === 'given' && (
                          <label className="admin-field">
                            <span>Готовый ответ (пример)</span>
                            <input
                              value={row.given}
                              onChange={(e) => setQaRow(qIndex, rowIndex, { given: e.target.value })}
                              placeholder="Hannelore K."
                            />
                          </label>
                        )}

                        {rowType === 'short' && (
                          <label className="admin-field">
                            <span>Допустимые ответы <em>(через запятую)</em></span>
                            <input
                              required
                              value={(row.acceptedAnswers || []).join(', ')}
                              onChange={(e) =>
                                setQaRow(qIndex, rowIndex, {
                                  acceptedAnswers: e.target.value.split(',').map((s) => s.trim()).filter(Boolean),
                                })
                              }
                              placeholder="das Chatten, beim Chatten"
                            />
                          </label>
                        )}

                        {rowType === 'freeText' && (
                          <label className="admin-field">
                            <span>Текст после пропуска <em>(необязательно — уже готовое продолжение предложения)</em></span>
                            <input
                              value={row.after || ''}
                              onChange={(e) => setQaRow(qIndex, rowIndex, { after: e.target.value })}
                              placeholder=", gefährden soziale Medien die psychische Gesundheit von Jugendlichen massiv."
                            />
                          </label>
                        )}

                        {rowType === 'freeText' && (
                          <label className="admin-field">
                            <span>Примерный ответ <em>(необязательно — показывается после «Ответить», чтобы было с чем свериться)</em></span>
                            <textarea
                              rows={2}
                              value={row.sampleAnswer || ''}
                              onChange={(e) => setQaRow(qIndex, rowIndex, { sampleAnswer: e.target.value })}
                              placeholder="Ключ или образец ответа для самопроверки"
                            />
                          </label>
                        )}

                        {rowType !== 'given' && (
                          <label className="admin-field">
                            <span>Баллы за пункт <em>(необязательно, только для отображения)</em></span>
                            <input
                              type="number"
                              min="0"
                              value={row.points ?? ''}
                              onChange={(e) => setQaRow(qIndex, rowIndex, { points: e.target.value === '' ? null : Number(e.target.value) })}
                              placeholder="2"
                            />
                          </label>
                        )}
                      </div>
                    )
                  })}

                  <button type="button" className="admin-add-link" onClick={() => addQaRow(qIndex)}>
                    + Строка
                  </button>
                </div>
              )}

              {q.type === 'tf_table' && (
                <div className="admin-qa-editor">
                  <p className="admin-note">
                    Балл засчитывается, только если человек и верно отметил richtig/falsch, и правильно ввёл первые
                    четыре слова доказательного предложения — раздельной проверки по частям тут нет, как и в
                    оригинале задания. Отметьте одну строку как «Пример» — она покажется ученику уже решённой.
                  </p>

                  {q.tfTable.rows.map((row, rowIndex) => (
                    <div className="admin-qa-row" key={row.id}>
                      <div className="admin-qa-row-head">
                        <button
                          type="button"
                          className={'admin-cell-toggle' + (row.isExample ? ' given' : '')}
                          onClick={() => setTfRow(qIndex, rowIndex, { isExample: !row.isExample })}
                        >
                          {row.isExample ? 'Пример' : 'Проверяется'}
                        </button>
                        <button
                          type="button"
                          className="admin-delete-btn"
                          disabled={q.tfTable.rows.length <= 1}
                          onClick={() => removeTfRow(qIndex, rowIndex)}
                          aria-label="Удалить строку"
                        >
                          ✕
                        </button>
                      </div>

                      <label className="admin-field">
                        <span>Утверждение</span>
                        <textarea
                          rows={2}
                          value={row.statement}
                          onChange={(e) => setTfRow(qIndex, rowIndex, { statement: e.target.value })}
                          placeholder="Äußere Merkmale erzeugen den Wunsch, sich um ein Tier zu kümmern."
                        />
                      </label>

                      <div className="admin-field-row">
                        <label className="admin-field">
                          <span>Правильный ответ</span>
                          <select
                            value={row.correct ? 'true' : 'false'}
                            onChange={(e) => setTfRow(qIndex, rowIndex, { correct: e.target.value === 'true' })}
                          >
                            <option value="true">richtig</option>
                            <option value="false">falsch</option>
                          </select>
                        </label>
                      </div>

                      <label className="admin-field">
                        <span>Первые четыре слова доказательного предложения <em>(по одному в поле)</em></span>
                        <div className="admin-tf-words">
                          {row.words.map((word, wordIndex) => (
                            <input
                              key={wordIndex}
                              value={word}
                              onChange={(e) => setTfRowWord(qIndex, rowIndex, wordIndex, e.target.value)}
                              placeholder={`Слово ${wordIndex + 1}`}
                            />
                          ))}
                        </div>
                      </label>
                    </div>
                  ))}

                  <button type="button" className="admin-add-link" onClick={() => addTfRow(qIndex)}>
                    + Строка
                  </button>
                </div>
              )}

              {q.type === 'essay_choice' && (
                <div className="admin-qa-editor">
                  <p className="admin-note">
                    Общий текст вопроса выше — это инструкция уровня всего задания (необязательна, можно оставить
                    короткой). Ниже — темы на выбор: если тема одна, ученик сразу увидит задание без экрана выбора;
                    если тем несколько — сначала выбирает одну, а после выбора видит картинку/текст и пункты только
                    выбранной темы. Не проверяется автоматически — сохраняется как есть.
                  </p>

                  {q.essayChoice.options.map((opt, optionIndex) => (
                    <div className="admin-qa-row" key={opt.id}>
                      <div className="admin-qa-row-head">
                        <div className="admin-part-index">{opt.id}</div>
                        <button
                          type="button"
                          className="admin-delete-btn"
                          disabled={q.essayChoice.options.length <= 1}
                          onClick={() => removeEssayOption(qIndex, optionIndex)}
                          aria-label="Удалить тему"
                        >
                          ✕
                        </button>
                      </div>

                      <label className="admin-field">
                        <span>Название темы</span>
                        <input
                          value={opt.title}
                          onChange={(e) => setEssayOption(qIndex, optionIndex, { title: e.target.value })}
                          placeholder="Schreibaufgabe 1"
                        />
                      </label>

                      <label className="admin-field">
                        <span>Текстовый отрывок <em>(необязательно — если тема начинается с текста для чтения)</em></span>
                        <textarea
                          rows={4}
                          value={opt.text}
                          onChange={(e) => setEssayOption(qIndex, optionIndex, { text: e.target.value })}
                          placeholder="Neue Ernährungstrends. Auch wenn Fleisch noch immer…"
                        />
                      </label>

                      <label className="admin-field">
                        <span>Картинка <em>(необязательно — если тема опирается на график/инфографику)</em></span>
                        {opt.image ? (
                          <div className="admin-passage-head">
                            <span className="admin-part-label-input" style={{ flex: 1 }}>Картинка загружена</span>
                            <button type="button" className="admin-delete-btn" onClick={() => setEssayOption(qIndex, optionIndex, { image: '' })}>
                              ✕
                            </button>
                          </div>
                        ) : (
                          <input type="file" accept="image/*" onChange={(e) => handleEssayOptionImageChange(qIndex, optionIndex, e.target.files?.[0])} />
                        )}
                      </label>

                      <label className="admin-field">
                        <span>Пункты задания <em>(что нужно раскрыть в ответе)</em></span>
                        <div className="admin-single-choice-editor">
                          {opt.instructions.map((line, instrIndex) => (
                            <div className="admin-single-choice-option" key={instrIndex}>
                              <span className="admin-part-index">{instrIndex + 1}</span>
                              <input
                                value={line}
                                onChange={(e) => setEssayInstruction(qIndex, optionIndex, instrIndex, e.target.value)}
                                placeholder="Geben Sie einleitend kurz die zentrale Aussage wieder."
                              />
                              <button
                                type="button"
                                className="admin-delete-btn"
                                disabled={opt.instructions.length <= 1}
                                onClick={() => removeEssayInstruction(qIndex, optionIndex, instrIndex)}
                                aria-label="Удалить пункт"
                              >
                                ✕
                              </button>
                            </div>
                          ))}
                          <button type="button" className="admin-add-link" onClick={() => addEssayInstruction(qIndex, optionIndex)}>
                            + Пункт
                          </button>
                        </div>
                      </label>
                    </div>
                  ))}

                  <button type="button" className="admin-add-link" onClick={() => addEssayOption(qIndex)}>
                    + Тема
                  </button>
                </div>
              )}

              {q.type === 'free_text' && (
                <p className="admin-note">
                  Это задание не проверяется автоматически — на странице теста человек просто впишет ответ в текстовое поле.
                </p>
              )}

              {q.type === 'multi_part' && (
                <div className="admin-multipart">
                  <p className="admin-note">
                    Общий текст условия — поле «Текст вопроса» выше. Ниже — независимо проверяемые пункты; итог по
                    вопросу — доля пунктов, отвеченных верно.
                  </p>

                  {q.parts.map((part, partIndex) => (
                    <div className="admin-part-card" key={part.id}>
                      <div className="admin-part-head">
                        <span className="admin-part-index">{partIndex + 1}</span>
                        <input
                          className="admin-part-label-input"
                          value={part.label}
                          onChange={(e) => setPart(qIndex, partIndex, { label: e.target.value })}
                          placeholder="Например: a) Заполните таблицу"
                        />
                        <select value={part.type} onChange={(e) => setPartType(qIndex, partIndex, e.target.value)}>
                          <option value="numeric">Число</option>
                          <option value="single_choice">Один из вариантов</option>
                          <option value="table">Таблица</option>
                          <option value="short_answer">Короткий ответ</option>
                          <option value="free_text">Текст</option>
                        </select>
                        <label className="admin-part-example-toggle">
                          <input
                            type="checkbox"
                            checked={!!part.isExample}
                            onChange={(e) => setPart(qIndex, partIndex, { isExample: e.target.checked })}
                          />
                          Пример
                        </label>
                        <button
                          type="button"
                          className="admin-delete-btn"
                          disabled={q.parts.length <= 1}
                          onClick={() => removePart(qIndex, partIndex)}
                          aria-label="Удалить пункт"
                        >
                          ✕
                        </button>
                      </div>

                      <label className="admin-field">
                        <span>Подсказка по формату ответа <em>(необязательно — показывается под пунктом на странице теста)</em></span>
                        <input
                          value={part.hint || ''}
                          onChange={(e) => setPart(qIndex, partIndex, { hint: e.target.value })}
                          placeholder="Например: введите в виде дроби, например 3/4"
                        />
                      </label>

                      {part.type === 'numeric' && (
                        <div className="admin-field-row">
                          <label className="admin-field">
                            <span>Правильный ответ</span>
                            <input
                              type="number"
                              step="any"
                              value={part.correctValue}
                              onChange={(e) => setPart(qIndex, partIndex, { correctValue: Number(e.target.value) })}
                            />
                          </label>
                          <label className="admin-field">
                            <span>Погрешность (±)</span>
                            <input
                              type="number"
                              step="any"
                              min="0"
                              value={part.tolerance}
                              onChange={(e) => setPart(qIndex, partIndex, { tolerance: Number(e.target.value) })}
                            />
                          </label>
                          <label className="admin-field">
                            <span>Единица <em>(необязательно)</em></span>
                            <input
                              value={part.unit || ''}
                              onChange={(e) => setPart(qIndex, partIndex, { unit: e.target.value })}
                              placeholder="например, %"
                            />
                          </label>
                        </div>
                      )}

                      {part.type === 'single_choice' && (
                        <div className="admin-single-choice-editor">
                          {part.options.map((opt) => (
                            <div className="admin-single-choice-option" key={opt.id}>
                              <span className="admin-part-index">{opt.id}</span>
                              <input
                                value={opt.text}
                                onChange={(e) => setPartOptionText(qIndex, partIndex, opt.id, e.target.value)}
                                placeholder="Текст варианта"
                              />
                              <button
                                type="button"
                                className="admin-delete-btn"
                                disabled={part.options.length <= 2}
                                onClick={() =>
                                  setPart(qIndex, partIndex, {
                                    options: part.options.filter((o) => o.id !== opt.id),
                                    correctOptionId: part.correctOptionId === opt.id ? part.options[0].id : part.correctOptionId,
                                  })
                                }
                                aria-label="Удалить вариант"
                              >
                                ✕
                              </button>
                            </div>
                          ))}
                          <button
                            type="button"
                            className="admin-add-link"
                            disabled={part.options.length >= 6}
                            onClick={() =>
                              setPart(qIndex, partIndex, {
                                options: [
                                  ...part.options,
                                  { id: String.fromCharCode(97 + part.options.length), text: '' },
                                ],
                              })
                            }
                          >
                            + Вариант
                          </button>
                          <label className="admin-field">
                            <span>Правильный вариант</span>
                            <select
                              value={part.correctOptionId}
                              onChange={(e) => setPart(qIndex, partIndex, { correctOptionId: e.target.value })}
                            >
                              {part.options.map((opt) => (
                                <option key={opt.id} value={opt.id}>
                                  {opt.id}) {opt.text || '—'}
                                </option>
                              ))}
                            </select>
                          </label>
                        </div>
                      )}

                      {part.type === 'free_text' && (
                        <>
                          <p className="admin-note">Не проверяется автоматически — человек впишет ответ и сам оценит его после проверки.</p>
                          <label className="admin-field">
                            <span>Примерный ответ <em>(необязательно — показывается после «Ответить», чтобы было с чем свериться)</em></span>
                            <textarea
                              rows={3}
                              value={part.sampleAnswer || ''}
                              onChange={(e) => setPart(qIndex, partIndex, { sampleAnswer: e.target.value })}
                              placeholder="Ключевые слова или образец ответа для самопроверки"
                            />
                          </label>
                        </>
                      )}

                      {part.type === 'short_answer' && (
                        <label className="admin-field">
                          <span>Допустимые варианты ответа <em>(через запятую)</em></span>
                          <input
                            required
                            value={(part.acceptedAnswers || []).join(', ')}
                            onChange={(e) =>
                              setPart(qIndex, partIndex, {
                                acceptedAnswers: e.target.value.split(',').map((s) => s.trim()).filter(Boolean),
                              })
                            }
                            placeholder="bekommen, erhalten"
                          />
                        </label>
                      )}

                      {part.type === 'table' && (
                        <div className="admin-table-editor">
                          <div className="admin-table-editor-scroll">
                            <table>
                              <thead>
                                <tr>
                                  <th />
                                  {part.table.columns.map((col, c) => (
                                    <th key={c}>
                                      <input value={col} onChange={(e) => setTableColumnLabel(qIndex, partIndex, c, e.target.value)} />
                                      <button
                                        type="button"
                                        className="admin-table-editor-remove"
                                        disabled={part.table.columns.length <= 1}
                                        onClick={() => removeTableColumn(qIndex, partIndex, c)}
                                        aria-label="Удалить колонку"
                                      >
                                        ✕
                                      </button>
                                    </th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody>
                                {part.table.rows.map((rowLabel, r) => (
                                  <tr key={r}>
                                    <th>
                                      <input value={rowLabel} onChange={(e) => setTableRowLabel(qIndex, partIndex, r, e.target.value)} />
                                      <button
                                        type="button"
                                        className="admin-table-editor-remove"
                                        disabled={part.table.rows.length <= 1}
                                        onClick={() => removeTableRow(qIndex, partIndex, r)}
                                        aria-label="Удалить строку"
                                      >
                                        ✕
                                      </button>
                                    </th>
                                    {part.table.columns.map((_, c) => {
                                      const cell = part.table.cells[r][c]
                                      const isGiven = cell.given !== undefined
                                      return (
                                        <td key={c}>
                                          <button
                                            type="button"
                                            className={'admin-cell-toggle' + (isGiven ? ' given' : '')}
                                            onClick={() => toggleTableCellGiven(qIndex, partIndex, r, c)}
                                          >
                                            {isGiven ? 'Дано' : 'Вычисляется'}
                                          </button>
                                          {isGiven ? (
                                            <input
                                              type="number"
                                              step="any"
                                              value={cell.given}
                                              onChange={(e) => setTableCell(qIndex, partIndex, r, c, { given: Number(e.target.value) })}
                                            />
                                          ) : (
                                            <div className="admin-cell-answer-row">
                                              <input
                                                type="number"
                                                step="any"
                                                value={cell.correctValue}
                                                onChange={(e) => setTableCell(qIndex, partIndex, r, c, { correctValue: Number(e.target.value) })}
                                                placeholder="Ответ"
                                              />
                                              <input
                                                type="number"
                                                step="any"
                                                min="0"
                                                value={cell.tolerance ?? 1}
                                                onChange={(e) => setTableCell(qIndex, partIndex, r, c, { tolerance: Number(e.target.value) })}
                                                placeholder="±"
                                                title="Допустимая погрешность"
                                              />
                                            </div>
                                          )}
                                        </td>
                                      )
                                    })}
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                          <div className="admin-table-editor-actions">
                            <button type="button" className="admin-add-link" onClick={() => addTableColumn(qIndex, partIndex)}>
                              + Колонка
                            </button>
                            <button type="button" className="admin-add-link" onClick={() => addTableRow(qIndex, partIndex)}>
                              + Строка
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}

                  <div className="admin-add-part-row">
                    <button type="button" className="admin-add-link" onClick={() => addPart(qIndex, 'numeric')}>
                      + Числовой пункт
                    </button>
                    <button type="button" className="admin-add-link" onClick={() => addPart(qIndex, 'single_choice')}>
                      + Пункт-выбор
                    </button>
                    <button type="button" className="admin-add-link" onClick={() => addPart(qIndex, 'table')}>
                      + Пункт-таблица
                    </button>
                    <button type="button" className="admin-add-link" onClick={() => addPart(qIndex, 'free_text')}>
                      + Текстовый пункт
                    </button>
                  </div>
                </div>
              )}
            </div>
          )
              })}

              <button
                type="button"
                className="btn btn-outline admin-add-question-btn"
                onClick={() => addQuestion(activeSection === UNSECTIONED ? undefined : activeSection)}
              >
                + Добавить вопрос
              </button>
            </div>
          </>
        )}

        {saveError && <p className="auth-error">{saveError}</p>}

        <div className="admin-form-actions">
          <button className="btn btn-primary" type="submit" disabled={saving}>
            {saving ? 'Сохранение…' : 'Сохранить пробник'}
          </button>
          <Link className="btn btn-outline" to={`/admin/${examKey}`}>Отмена</Link>
        </div>
      </form>
    </div>
  )
}
