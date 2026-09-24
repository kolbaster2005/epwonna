import { supabase } from '../lib/supabaseClient.js'
import { listAllQuestionsForBank, ensureTaskBankTest } from './testsService.js'
import { listTaskAttempts } from './taskAttemptsService.js'

function sample(arr) {
  return arr[Math.floor(Math.random() * arr.length)]
}

// Picks one task from `pool`, trying each filter stage in order until
// one leaves at least one candidate. Reports which stage it had to fall
// back to, so the caller can warn the person when their topic choice
// didn't fully pan out — never just silently swaps something in.
//
// Stage 1: matches the chosen topics AND not yet solved
// Stage 2: matches the chosen topics (solved or not)
// Stage 3: any topic, not yet solved
// Stage 4: any topic, solved or not (last resort — only empty if the
//          category itself has nothing at all)
function pickWithFallback(pool, { topicIds, solvedIds, exclude }) {
  const notExcluded = pool.filter((t) => !exclude.has(t.id))
  const byTopic = topicIds.length ? notExcluded.filter((t) => t.topicIds.some((tp) => topicIds.includes(tp))) : notExcluded
  const unsolved = (list) => list.filter((t) => !solvedIds.has(t.id))

  const stages = topicIds.length
    ? [
        { list: unsolved(byTopic), relaxed: false },
        { list: byTopic, relaxed: false },
        { list: unsolved(notExcluded), relaxed: true },
        { list: notExcluded, relaxed: true },
      ]
    : [
        { list: unsolved(notExcluded), relaxed: false },
        { list: notExcluded, relaxed: false },
      ]

  for (const stage of stages) {
    if (stage.list.length > 0) return { task: sample(stage.list), relaxed: stage.relaxed }
  }
  return { task: null, relaxed: true }
}

// Generates one probnik: 2 Чтение (different mechanic types where
// possible), 1 Umformung + 1 Satzfortsetzungen, 1 Письмо (an existing
// Stellungnahme + an existing Grafikinterpretation merged into one
// two-card essay_choice). Reuses existing task ids for reading/grammar
// via test_tasks — nothing gets duplicated. Returns { testId, warnings }.
export async function generateProbnik({ examKey, userId, topicIds = [] }) {
  const [allTasks, attempts, bankTest] = await Promise.all([
    listAllQuestionsForBank(examKey),
    listTaskAttempts(userId, examKey),
    ensureTaskBankTest(examKey),
  ])
  const solvedIds = new Set(Object.keys(attempts))

  const reading = allTasks.filter((t) => t.category === 'Чтение')
  const umformung = allTasks.filter((t) => t.category === 'Грамматика' && t.taskType === 'Umformung')
  const satzfortsetzungen = allTasks.filter((t) => t.category === 'Грамматика' && t.taskType === 'Satzfortsetzungen')
  const stellungnahme = allTasks.filter((t) => t.category === 'Письмо' && t.taskType === 'Stellungnahme')
  const grafikinterpretation = allTasks.filter((t) => t.category === 'Письмо' && t.taskType === 'Grafikinterpretation')

  const warnings = []
  const used = new Set()

  function pick(pool, label) {
    const { task, relaxed } = pickWithFallback(pool, { topicIds, solvedIds, exclude: used })
    if (task) {
      used.add(task.id)
      if (relaxed && topicIds.length) warnings.push(`${label}: по выбранным темам не нашлось подходящего задания — взято случайное.`)
    }
    return task
  }

  const r1 = pick(reading, 'Чтение')
  // Второе чтение — по возможности другого типа (multi_part/cloze/qa_table/true_false), чем первое.
  const r2Pool = r1 ? reading.filter((t) => t.type !== r1.type) : reading
  const r2 = pick(r2Pool.length ? r2Pool : reading, 'Чтение')

  const g1 = pick(umformung, 'Грамматика (Umformung)')
  const g2 = pick(satzfortsetzungen, 'Грамматика (Satzfortsetzungen)')

  const w1 = pick(stellungnahme, 'Письмо (Stellungnahme)')
  const w2 = pick(grafikinterpretation, 'Письмо (Grafikinterpretation)')

  const missing = [
    !r1 && 'чтение', !r2 && 'чтение', !g1 && 'грамматика (Umformung)', !g2 && 'грамматика (Satzfortsetzungen)',
    !w1 && 'письмо (Stellungnahme)', !w2 && 'письмо (Grafikinterpretation)',
  ].filter(Boolean)
  if (missing.length) {
    throw new Error(`В банке пока недостаточно заданий, чтобы собрать пробник (не хватает: ${missing.join(', ')}).`)
  }

  const testId = `${examKey}-generated-${Date.now().toString(36)}`
  const chosenTopicLabels = topicIds.length ? topicIds.join(', ') : 'случайные'

  const { error: testError } = await supabase.from('tests').insert({
    id: testId,
    exam_key: examKey,
    title: 'Сгенерированный пробник',
    short_description: `Автоматически собран из банка заданий. Темы: ${chosenTopicLabels}.`,
    is_official: false,
    is_generated: true,
    format: 'written',
    year: new Date().getFullYear(),
    duration_minutes: 180,
    topics: topicIds.length ? topicIds : null,
  })
  if (testError) throw testError

  const linkRows = [r1, r2, g1, g2].map((t, i) => ({ test_id: testId, task_id: t.id, position: i }))
  const { error: linkError } = await supabase.from('test_tasks').upsert(linkRows, { onConflict: 'test_id,task_id' })
  if (linkError) throw linkError

  // Письмо — так же, как для тех 11 вручную собранных пробников: два
  // отдельных задания банка сливаются в одно с выбором из двух карточек.
  const { data: w1Row } = await supabase.from('questions').select('*').eq('id', w1.id).single()
  const { data: w2Row } = await supabase.from('questions').select('*').eq('id', w2.id).single()
  const w1Opt = w1Row.essay_choice?.options?.[0] || {}
  const w2Opt = w2Row.essay_choice?.options?.[0] || {}
  const mergedEssayChoice = {
    options: [
      { id: 'a', title: 'Stellungnahme', text: w1Opt.text || '', image: w1Row.image || '', instructions: w1Row.instructions || [] },
      { id: 'b', title: 'Grafikinterpretation', text: w2Opt.text || '', image: w2Row.image || '', instructions: w2Row.instructions || [] },
    ],
  }
  const writingId = `${testId}-schreiben`
  const { error: writingError } = await supabase.from('questions').insert({
    id: writingId,
    test_id: bankTest.id,
    position: 999,
    category: 'Письмо',
    type: 'essay_choice',
    text: w1Row.text,
    essay_choice: mergedEssayChoice,
    task_type: 'Stellungnahme/Grafikinterpretation',
    self_grade_max_points: 20,
  })
  if (writingError) throw writingError
  const { error: writingLinkError } = await supabase
    .from('test_tasks')
    .upsert({ test_id: testId, task_id: writingId, position: 4 }, { onConflict: 'test_id,task_id' })
  if (writingLinkError) throw writingLinkError

  return { testId, warnings }
}
