// Shared between TestPage.jsx (live test-taking) and AttemptReview.jsx
// (read-only review of a finished attempt) — both render the exact same
// sidebar/question-group layout, just with different interactivity, so
// the bits that are pure data shaping live here instead of being
// duplicated.

export function formatTime(totalSeconds) {
  const s = Math.max(0, totalSeconds)
  const m = Math.floor(s / 60)
  const r = s % 60
  return `${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}`
}

export const MICROLABEL_BY_TYPE = {
  multiple_choice: 'Варианты ответов (можно выбрать несколько)',
  numeric: 'Ваш ответ',
  true_false: 'Отметьте верно или неверно для каждого утверждения',
  heading_match: 'Ваш ответ',
  short_answer: 'Ваш ответ',
  cloze: 'Заполните пропуски в тексте',
  qa_table: 'Заполните таблицу',
  tf_table: 'Отметьте верно/неверно и укажите доказательное предложение',
  free_text: 'Ваш ответ',
  essay_choice: 'Выберите тему и напишите текст',
  multi_part: 'Ответьте на все пункты',
}

// The written exam always has the same fixed section order regardless of
// which order the questions themselves were added to the test in — sort
// groups by this instead of insertion order. Anything not listed here
// (a category typo, or a future section) just falls in after the known
// ones, in whatever order it was first seen.
const CATEGORY_ORDER = ['Часть А', 'Часть Б', 'Чтение', 'Аудирование', 'Грамматика', 'Письмо']

// Groups questions by their `category` field (see supabase/schema.sql) while
// preserving first-seen order, so the sidebar shows "Часть А, Часть Б"
// or "Чтение, Грамматика, Письмо" in a sensible order without needing a
// separate config for it — the question data is the source of truth.
export function groupByCategory(questions) {
  const groups = []
  const byName = new Map()
  questions.forEach((q, i) => {
    const name = q.category || 'Вопросы'
    if (!byName.has(name)) {
      const group = { name, items: [] }
      byName.set(name, group)
      groups.push(group)
    }
    byName.get(name).items.push({ question: q, index: i })
  })
  return groups.sort((a, b) => {
    const ai = CATEGORY_ORDER.indexOf(a.name)
    const bi = CATEGORY_ORDER.indexOf(b.name)
    return (ai === -1 ? CATEGORY_ORDER.length : ai) - (bi === -1 ? CATEGORY_ORDER.length : bi)
  })
}
