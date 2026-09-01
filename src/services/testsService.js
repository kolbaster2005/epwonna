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

const TABLE = 'tests'

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
      .select('*, questions(*)')
      .eq('exam_key', examKey)
      .order('is_pinned', { ascending: false })
      .order('year', { ascending: false })
      .order('id', { ascending: true })
      .order('position', { foreignTable: 'questions', ascending: true })

    if (error) throw error
    return (data || []).map(rowToTest)
  } catch (err) {
    console.error('[testsService.listTests]', err)
    return []
  }
}

export async function getTest(examKey, testId) {
  try {
    const { data, error } = await supabase
      .from(TABLE)
      .select('*, questions(*)')
      .eq('exam_key', examKey)
      .eq('id', testId)
      .order('position', { foreignTable: 'questions', ascending: true })
      .maybeSingle()

    if (error) throw error
    return data ? rowToTest(data) : null
  } catch (err) {
    console.error('[testsService.getTest]', err)
    return null
  }
}

export async function createTest(examKey, data) {
  try {
    const id = data.id || uid(examKey)
    const row = testToRow(examKey, { ...data, id })

    const { error } = await supabase.from(TABLE).insert(row)
    if (error) throw error

    if (data.questions?.length) {
      const qRows = data.questions.map((q, i) => questionToRow(id, i, q))
      const { error: qError } = await supabase.from('questions').insert(qRows)
      if (qError) throw qError
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
      const { error: delError } = await supabase.from('questions').delete().eq('test_id', testId)
      if (delError) throw delError

      if (patch.questions.length) {
        const qRows = patch.questions.map((q, i) => questionToRow(testId, i, q))
        const { error: insError } = await supabase.from('questions').insert(qRows)
        if (insError) throw insError
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
