// ---------------------------------------------------------------------
// Real data service backed by Supabase — see supabase/schema.sql for
// the tables (`tests`, `questions`) and supabase/seed.sql for the one
// demo пробник per exam this ships with.
//
// This file replaced an in-memory mock that had the exact same function
// signatures and return shapes. That's not a coincidence — the whole
// point of routing every page through this service layer from the start
// was so that swapping the mock for a real backend would only ever mean
// rewriting this one file. Nothing in pages/ or components/ changed.
//
// DB rows are snake_case (Postgres convention); the app's data shape is
// camelCase (title, shortDescription, correctOptionIds, ...). The
// rowToTest/rowToQuestion/testToRow/questionToRow functions below are
// the only place that translation happens.
//
// Every exported function wraps its Supabase call in try/catch, on
// purpose: `await`ing a Supabase query rejects (rather than resolving
// with `{ error }`) on network-level failures (DNS, CORS, offline, a
// misconfigured URL/key). Without a catch here, that rejection would
// propagate to callers like ExamPage's `.then(...)` — which has no
// `.catch()` — leaving `loading` stuck `true` forever with no visible
// error. Read functions (list/get) fail soft (empty list / null) so the
// UI can show "not found" / "empty" states; write functions (create/
// update/delete) re-throw as a plain Error so the admin form can show
// a message instead of hanging on "Сохранение…".
// ---------------------------------------------------------------------

import { supabase } from '../lib/supabaseClient.js'
import { exams } from '../data/examData.js'
import { listTaskTopicsFor } from './topicsService.js'

const TABLE = 'tests'

// "epd-schriftlich-2" should sort before "epd-schriftlich-10" — plain
// string comparison puts "1" before "2" character-by-character, so
// "...-10" and "...-11" land right after "...-1" and before "...-2".
// Splits both ids into alternating text/number chunks and compares
// number chunks as numbers, text chunks as strings.
function naturalCompare(a, b) {
  const split = (s) => (s.match(/\d+|\D+/g) || [])
  const ax = split(a)
  const bx = split(b)
  const len = Math.max(ax.length, bx.length)
  for (let i = 0; i < len; i++) {
    const ap = ax[i] ?? ''
    const bp = bx[i] ?? ''
    const aNum = /^\d+$/.test(ap)
    const bNum = /^\d+$/.test(bp)
    if (aNum && bNum) {
      const diff = Number(ap) - Number(bp)
      if (diff) return diff
    } else {
      const diff = ap.localeCompare(bp)
      if (diff) return diff
    }
  }
  return 0
}

function uid(prefix) {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`
}

// Normalizes anything thrown/rejected (a Supabase PostgrestError object,
// a raw fetch TypeError, etc.) into a plain Error with a readable
// message, so UI code can always just do `err.message`.
function toError(err) {
  // "Failed to fetch" is the browser's generic "the request never got a
  // response" error — it means the network call never reached Supabase
  // at all (wrong/placeholder URL, dev server started before `.env` was
  // filled in, ad-blocker, offline). It is NOT what Supabase itself
  // returns for auth/permission problems (those come back as a normal
  // JSON error with a readable message) — so it deserves a distinct,
  // more actionable message instead of the cryptic browser text.
  if (err instanceof TypeError && /fetch/i.test(err.message)) {
    return new Error(
      'Не удалось связаться с базой данных (Failed to fetch). Проверьте: 1) .env заполнен и dev-сервер ' +
        'перезапущен после этого (npm run dev), 2) в нём нет опечаток в VITE_SUPABASE_URL, ' +
        '3) блокировщики рекламы/антивирус не блокируют запросы к supabase.co.'
    )
  }
  if (err instanceof Error) return err
  return new Error(err?.message || 'Не удалось выполнить запрос к базе данных.')
}

// ---- DB row ⇄ app shape mapping ----------------------------------------

function rowToQuestion(row) {
  const base = {
    id: row.id,
    category: row.category ?? undefined,
    type: row.type,
    text: row.text,
    image: row.image ?? undefined,
    explanation: row.explanation ?? undefined,
    // Points at an id inside this question's test's own `passages`
    // array (see rowToTest below) — not embedded text. TestPage looks
    // this up to show the shared reading passage in its own panel.
    passageId: row.passage_id ?? undefined,
    selfGradeMaxPoints: row.self_grade_max_points ?? undefined,
    taskType: row.task_type ?? undefined,
    contentId: row.content_id ?? undefined,
    sourceUrl: row.source_url ?? undefined,
    taskNumber: row.task_number ?? undefined,
    instructions: row.instructions ?? undefined,
    examPartId: row.exam_part_id ?? undefined,
  }
  switch (row.type) {
    case 'numeric':
      return { ...base, correctValue: row.correct_value, tolerance: row.tolerance, unit: row.unit ?? undefined }
    case 'true_false':
      return { ...base, statements: row.statements || [] }
    case 'heading_match':
      return { ...base, correctSequence: row.correct_sequence }
    case 'short_answer':
      return { ...base, acceptedAnswers: row.accepted_answers || [] }
    case 'cloze':
      return { ...base, cloze: row.cloze || { template: '', blanks: {} } }
    case 'qa_table':
      return { ...base, qaTable: row.qa_table || { rows: [] } }
    case 'tf_table':
      return { ...base, tfTable: row.tf_table || { rows: [] } }
    case 'essay_choice':
      return { ...base, essayChoice: row.essay_choice || { options: [] } }
    case 'free_text':
      return base
    case 'multi_part':
      return { ...base, parts: row.parts || [] }
    case 'multiple_choice':
    default:
      return { ...base, options: row.options || [], correctOptionIds: row.correct_option_ids || [] }
  }
}

function questionToRow(testId, position, q) {
  const base = {
    id: q.id,
    test_id: testId,
    position,
    category: q.category ?? null,
    type: q.type || 'multiple_choice',
    text: q.text,
    image: q.image ?? null,
    explanation: q.explanation ?? null,
    passage_id: q.passageId ?? null,
    self_grade_max_points: q.selfGradeMaxPoints ?? null,
    task_type: q.taskType ?? null,
    content_id: q.contentId ?? null,
    source_url: q.sourceUrl ?? null,
    ...(q.taskNumber != null ? { task_number: q.taskNumber } : {}),
    instructions: q.instructions ?? null,
    exam_part_id: q.examPartId ?? null,
  }
  switch (q.type) {
    case 'numeric':
      return { ...base, correct_value: q.correctValue, tolerance: q.tolerance, unit: q.unit ?? null }
    case 'true_false':
      return { ...base, statements: q.statements }
    case 'heading_match':
      return { ...base, correct_sequence: q.correctSequence }
    case 'short_answer':
      return { ...base, accepted_answers: q.acceptedAnswers }
    case 'cloze':
      return { ...base, cloze: q.cloze }
    case 'qa_table':
      return { ...base, qa_table: q.qaTable }
    case 'tf_table':
      return { ...base, tf_table: q.tfTable }
    case 'essay_choice':
      return { ...base, essay_choice: q.essayChoice }
    case 'free_text':
      return base
    case 'multi_part':
      return { ...base, parts: q.parts }
    case 'multiple_choice':
    default:
      return { ...base, options: q.options, correct_option_ids: q.correctOptionIds }
  }
}

function rowToTest(row) {
  return {
    id: row.id,
    title: row.title,
    shortDescription: row.short_description,
    fullDescription: row.full_description,
    isOfficial: row.is_official,
    isModel: row.is_model ?? false,
    isPinned: row.is_pinned ?? false,
    isTaskBank: row.is_task_bank ?? false,
    isGenerated: row.is_generated ?? false,
    topic: row.topic ?? undefined,
    format: row.format ?? undefined,
    year: row.year ?? undefined,
    durationMinutes: row.duration_minutes,
    pdfUrl: row.pdf_url ?? undefined,
    pdfFileName: row.pdf_file_name ?? undefined,
    oralTask: row.oral_task ?? undefined,
    // Shared reading/listening passages — see the schema.sql comment on
    // tests.passages. Not per-question; several questions can point at
    // the same one via question.passageId.
    passages: row.passages || [],
    questions: (row.questions || []).map(rowToQuestion),
  }
}

// Builds an update-able `tests` row from a (near-)complete test object —
// every caller in this codebase (AdminTestEditor's save) sends the whole
// test, not a sparse patch, so this doesn't try to merge with what's
// already in the DB.
function testToRow(examKey, test) {
  return {
    id: test.id,
    exam_key: examKey,
    title: test.title,
    short_description: test.shortDescription,
    full_description: test.fullDescription,
    is_official: test.isOfficial,
    is_model: test.isModel ?? false,
    is_pinned: test.isPinned ?? false,
    is_task_bank: test.isTaskBank ?? false,
    is_generated: test.isGenerated ?? false,
    topic: test.topic ?? null,
    format: test.format ?? null,
    year: test.year ?? null,
    duration_minutes: test.durationMinutes,
    pdf_url: test.pdfUrl ?? null,
    pdf_file_name: test.pdfFileName ?? null,
    oral_task: test.oralTask ?? null,
    passages: test.passages ?? null,
  }
}

// ---- Tests --------------------------------------------------------------

export async function listTests(examKey) {
  try {
    const { data, error } = await supabase
      .from(TABLE)
      .select('*')
      .eq('exam_key', examKey)
      .order('is_pinned', { ascending: false })
      .order('year', { ascending: false })
    if (error) throw error
    const tests = (data || []).sort((a, b) => {
      if (a.is_pinned !== b.is_pinned) return a.is_pinned ? -1 : 1
      if (a.year !== b.year) return (b.year ?? 0) - (a.year ?? 0)
      return naturalCompare(a.id, b.id)
    })

    const testIds = tests.map((t) => t.id)
    const counts = {}
    if (testIds.length > 0) {
      const { data: links, error: linksErr } = await supabase.from('test_tasks').select('test_id').in('test_id', testIds)
      if (linksErr) throw linksErr
      for (const row of links || []) counts[row.test_id] = (counts[row.test_id] || 0) + 1
    }

    return tests.map((row) => ({ ...rowToTest(row), questionCount: counts[row.id] ?? 0 }))
  } catch (err) {
    console.error('[testsService.listTests]', err)
    return []
  }
}

export async function getTest(examKey, testId) {
  try {
    const { data: testRow, error: testErr } = await supabase
      .from(TABLE)
      .select('*')
      .eq('exam_key', examKey)
      .eq('id', testId)
      .maybeSingle()
    if (testErr) throw testErr
    if (!testRow) return null

    // The actual list of tasks + their order for this test now lives in
    // test_tasks, not directly on questions.test_id — a task's test_id
    // is just where it was originally authored ("home"), but it can
    // legitimately also appear in other tests via test_tasks rows. See
    // schema.sql section 10.
    const { data: links, error: linksErr } = await supabase
      .from('test_tasks')
      .select('task_id, position')
      .eq('test_id', testId)
      .order('position', { ascending: true })
    if (linksErr) throw linksErr

    const taskIds = (links || []).map((l) => l.task_id)
    let questionRows = []
    if (taskIds.length > 0) {
      const { data: qData, error: qErr } = await supabase.from('questions').select('*').in('id', taskIds)
      if (qErr) throw qErr
      questionRows = qData || []
    }
    // .in() doesn't preserve order, so re-sort to match test_tasks.position.
    const byId = Object.fromEntries(questionRows.map((q) => [q.id, q]))
    const orderedQuestions = taskIds.map((id) => byId[id]).filter(Boolean)

    return rowToTest({ ...testRow, questions: orderedQuestions })
  } catch (err) {
    console.error('[testsService.getTest]', err)
    return null
  }
}

export async function createTest(examKey, data) {
  try {
    const id = data.id || uid(examKey)
    const row = testToRow(examKey, { ...data, id })

    const { error } = await supabase.from(TABLE).upsert(row, { onConflict: 'id' })
    if (error) throw error

    if (data.questions?.length) {
      const qRows = data.questions.map((q, i) => questionToRow(id, i, q))
      const { error: qError } = await supabase.from('questions').insert(qRows)
      if (qError) throw qError

      // test_tasks is what getTest actually reads from now — a freshly
      // inserted question needs a link row here too, or it won't show up.
      const linkRows = data.questions.map((q, i) => ({ test_id: id, task_id: q.id, position: i }))
      const { error: linkError } = await supabase.from('test_tasks').upsert(linkRows, { onConflict: 'test_id,task_id' })
      if (linkError) throw linkError
    }

    return getTest(examKey, id)
  } catch (err) {
    console.error('[testsService.createTest]', err)
    throw toError(err)
  }
}

// `patch` is expected to be a full test object (id + every `tests`
// field), same contract the old mock service had — AdminTestEditor
// always sends the whole edited form, never a sparse diff.
export async function updateTest(examKey, testId, patch) {
  try {
    const row = testToRow(examKey, { ...patch, id: testId })
    const { error } = await supabase.from(TABLE).update(row).eq('id', testId)
    if (error) throw error

    if (patch.questions) {
      // Full-replace: delete this test's questions and re-insert the
      // current array. Simpler and safer than diffing add/edit/remove,
      // and matches how the mock store always replaced the whole array.
      // Deleting a question cascades away any test_tasks row pointing at
      // it too (from this test AND from any other test that happened to
      // be sharing it) — that's expected: editing a task from its home
      // test is the one place that's allowed to actually change/remove
      // its content everywhere it's used, not just here.
      const { error: delError } = await supabase.from('questions').delete().eq('test_id', testId)
      if (delError) throw delError

      if (patch.questions.length) {
        const qRows = patch.questions.map((q, i) => questionToRow(testId, i, q))
        const { error: insError } = await supabase.from('questions').insert(qRows)
        if (insError) throw insError

        // getTest reads the task list from test_tasks now, not directly
        // from questions.test_id — needs a matching link row per task.
        const linkRows = patch.questions.map((q, i) => ({ test_id: testId, task_id: q.id, position: i }))
        const { error: linkError } = await supabase.from('test_tasks').upsert(linkRows, { onConflict: 'test_id,task_id' })
        if (linkError) throw linkError
      }
    }

    return getTest(examKey, testId)
  } catch (err) {
    console.error('[testsService.updateTest]', err)
    throw toError(err)
  }
}

// Deliberately a raw partial update, not routed through updateTest/
// testToRow — those build a full row from a full test-shaped object, so
// passing just { isPinned } through them would blank out topic/format/
// year/pdf fields/oral_task/passages (they fall back to `?? null` when
// absent from the patch). This one only ever touches is_pinned.
export async function setPinned(testId, isPinned) {
  try {
    const { error } = await supabase.from(TABLE).update({ is_pinned: isPinned }).eq('id', testId)
    if (error) throw error
    return true
  } catch (err) {
    console.error('[testsService.setPinned]', err)
    throw toError(err)
  }
}

export async function deleteTest(examKey, testId) {
  try {
    // `questions` rows cascade-delete via the FK in schema.sql.
    const { error } = await supabase.from(TABLE).delete().eq('id', testId).eq('exam_key', examKey)
    if (error) throw error
    return true
  } catch (err) {
    console.error('[testsService.deleteTest]', err)
    throw toError(err)
  }
}

// Finds (or creates, on first use) the one "Банк заданий" container test
// for this exam — a test row with is_task_bank: true, never shown to
// students, that exists purely so standalone tasks can be created/edited
// through the already-built test editor without needing a real published
// probnik to live inside. Fixed, predictable id so repeated calls don't
// create duplicates even without a unique constraint on is_task_bank.
export async function ensureTaskBankTest(examKey) {
  const id = `${examKey}-task-bank`
  const existing = await getTest(examKey, id)
  if (existing) return existing
  return createTest(examKey, {
    id,
    title: 'Банк заданий',
    shortDescription: 'Служебный контейнер — не показывается как пробник ученикам.',
    isOfficial: false,
    isTaskBank: true,
    format: exams[examKey]?.phases ? 'written' : undefined,
    year: new Date().getFullYear(),
    durationMinutes: 0,
    questions: [],
  })
}

// Every question for this exam, across every test (including the task
// bank container) — for the "Банк заданий" browsing/filter page. Each
// row also carries which test it currently lives in, since a task being
// "in the bank container" vs. "already part of a real published probnik"
// is meaningful context for the person browsing.
export async function listAllQuestionsForBank(examKey) {
  try {
    // Two plain queries instead of one "clever" embedded-filter query
    // (tests!inner(...) + .eq('tests.exam_key', ...)) — that syntax is
    // finicky to get right and silently returned nothing in practice.
    // This mirrors the same simple two-step approach getTest/listTests
    // already use successfully.
    const { data: examTests, error: testsErr } = await supabase.from(TABLE).select('id, title, is_task_bank').eq('exam_key', examKey)
    if (testsErr) throw testsErr
    const testsById = Object.fromEntries((examTests || []).map((t) => [t.id, t]))
    const testIds = Object.keys(testsById)
    if (testIds.length === 0) return []

    const { data: rows, error: qErr } = await supabase.from('questions').select('*').in('test_id', testIds)
    if (qErr) throw qErr
    rows?.sort((a, b) => naturalCompare(a.id, b.id))

    const topicsMap = await listTaskTopicsFor((rows || []).map((r) => r.id))
    return (rows || []).map((row) => {
      const test = testsById[row.test_id]
      return {
        ...rowToQuestion(row),
        testId: row.test_id,
        testTitle: test?.title ?? '',
        isTaskBankTest: test?.is_task_bank ?? false,
        topicIds: topicsMap[row.id] || [],
      }
    })
  } catch (err) {
    console.error('[testsService.listAllQuestionsForBank]', err)
    return []
  }
}

// For AdminTestEditor's "this task is also used elsewhere" warning —
// how many DIFFERENT tests each of these task ids currently appears in
// via test_tasks (1 = only here, not actually shared with anything).
export async function listTaskShareCounts(taskIds) {
  if (!taskIds?.length) return {}
  try {
    const { data, error } = await supabase.from('test_tasks').select('task_id, test_id').in('task_id', taskIds)
    if (error) throw error
    const testsByTask = {}
    for (const row of data || []) {
      if (!testsByTask[row.task_id]) testsByTask[row.task_id] = new Set()
      testsByTask[row.task_id].add(row.test_id)
    }
    return Object.fromEntries(Object.entries(testsByTask).map(([taskId, set]) => [taskId, set.size]))
  } catch (err) {
    console.error('[testsService.listTaskShareCounts]', err)
    return {}
  }
}
