import { useEffect, useState } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import { exams } from '../data/examData.js'
import { getTest } from '../services/testsService.js'
import { listContentByIds } from '../services/contentService.js'
import { getAttempt } from '../services/attemptsService.js'
import QuestionImage from '../components/QuestionImage.jsx'
import QuestionAnswerInput, { PAGINATE_THRESHOLD } from '../components/QuestionAnswerInput.jsx'
import FloatingPassageWindow from '../components/FloatingPassageWindow.jsx'
import PageLoader from '../components/PageLoader.jsx'
import { getVerdictWithSelfGrade, hasAnswer, defaultValue } from '../utils/grading.js'
import { MICROLABEL_BY_TYPE, groupByCategory } from '../utils/testLayout.js'

function formatDate(iso) {
  return new Date(iso).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

const SELF_GRADE_LABEL = { correct: 'верно', incorrect: 'неверно' }

// Read-only mirror of TestPage's sidebar-plus-main layout (same CSS
// classes, so it needs no styles of its own) for looking back at an
// already-finished attempt: every question is shown exactly as it was
// answered, with correctness colours everywhere TestPage would show
// them once a question is checked — the sidebar numbers, the input
// itself, and the feedback banner — but nothing here is editable.
export default function AttemptReview() {
  const { attemptId } = useParams()
  const navigate = useNavigate()
  const [attempt, setAttempt] = useState(undefined) // undefined = loading, null = not found
  const [test, setTest] = useState(null)
  const [contentPassages, setContentPassages] = useState([])

  const [index, setIndex] = useState(0)
  const [partIndex, setPartIndex] = useState(0)
  useEffect(() => {
    setPartIndex(0)
  }, [index])
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [view, setView] = useState('question')
  const [floatingOpen, setFloatingOpen] = useState(false)

  useEffect(() => {
    let cancelled = false
    getAttempt(attemptId).then(async (a) => {
      if (cancelled) return
      setAttempt(a)
      if (a) {
        const t = await getTest(a.examKey, a.testId)
        if (cancelled) return
        setTest(t)
        if (t) {
          const ids = (t.questions || []).map((q) => q.contentId)
          listContentByIds(ids).then((list) => {
            if (!cancelled) setContentPassages(list)
          })
        }
      }
    })
    return () => {
      cancelled = true
    }
  }, [attemptId])

  const questions = test?.questions || []
  const question = questions[index]

  useEffect(() => {
    if (!question) return
    const passageKey = question.passageId || question.contentId
    if (!passageKey) {
      setView('question')
      setFloatingOpen(false)
      return
    }
    const firstIdx = questions.findIndex((q) => (q.passageId || q.contentId) === passageKey)
    setView(questions[firstIdx]?.id === question.id ? 'text' : 'question')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [question?.id])

  if (attempt === undefined) {
    return <PageLoader />
  }

  if (!attempt || !test) {
    return (
      <div className="test-missing">
        <h1>Попытка не найдена</h1>
        <p>Возможно, пробник с тех пор был удалён.</p>
        <Link className="btn btn-primary" to="/my-learning">← К моему прогрессу</Link>
      </div>
    )
  }

  const exam = exams[attempt.examKey]
  const answers = attempt.answersSnapshot?.answers || {}
  const selfGrades = attempt.answersSnapshot?.selfGrades || {}
  const hasSnapshot = !!attempt.answersSnapshot

  if (!hasSnapshot) {
    return (
      <div className="mylearning-page">
        <div className="admin-header">
          <div>
            <h1>{attempt.testTitle}</h1>
            <p>
              Пройдено {formatDate(attempt.completedAt)} ·{' '}
              {attempt.scorePercent != null ? `${attempt.scorePercent}%` : 'без общей оценки'} · {exam.label}
            </p>
          </div>
          <Link className="btn btn-outline" to="/my-learning">← К моему прогрессу</Link>
        </div>
        <p className="admin-note">
          Для этой попытки не сохранён снимок ответов (она была пройдена до появления этой функции) — доступны
          только итоговые цифры на странице «Мой прогресс».
        </p>
      </div>
    )
  }

  const value = answers[question.id] ?? defaultValue(question.type)
  // Same fallback as verdictFor below — an unanswered question should
  // read as incorrect everywhere (sidebar, input highlighting, feedback
  // banner), not sit in an unstyled neutral state.
  const verdict = getVerdictWithSelfGrade(question, value, selfGrades[question.id]) || 'incorrect'
  const groups = groupByCategory(questions)
  const passageKey = question.passageId || question.contentId
  const passage = passageKey ? [...(test.passages || []), ...contentPassages].find((p) => p.id === passageKey) : null

  // getVerdictWithSelfGrade returns null for a question that was left
  // completely unanswered — the sidebar should still colour that red,
  // same as a wrong answer, rather than leaving it in the unstyled
  // default state.
  function verdictFor(q) {
    return getVerdictWithSelfGrade(q, answers[q.id] ?? defaultValue(q.type), selfGrades[q.id]) || 'incorrect'
  }

  function goTo(i) {
    setIndex(Math.min(Math.max(i, 0), questions.length - 1))
  }

  const isPaginatedMultiPart = question.type === 'multi_part' && question.parts.length > PAGINATE_THRESHOLD
  const isLast = index === questions.length - 1
  const isFirst = index === 0 && (!isPaginatedMultiPart || partIndex === 0)

  function handlePrev() {
    if (isPaginatedMultiPart && partIndex > 0) {
      setPartIndex((p) => p - 1)
      return
    }
    goTo(index - 1)
  }
  function handleNext() {
    if (isPaginatedMultiPart && partIndex < question.parts.length - 1) {
      setPartIndex((p) => p + 1)
      return
    }
    goTo(index + 1)
  }

  const selfGradeValue = selfGrades[question.id]
  const hasNumericSelfGrade = typeof selfGradeValue === 'number'
  const pointsNote = hasNumericSelfGrade ? `Вы поставили себе ${selfGradeValue} из ${question.selfGradeMaxPoints} баллов.` : null

  const questionCore = (
    <>
      <div className="test-question-head">
        <div className="test-microlabel">Вопрос{question.taskNumber != null ? ` #${question.taskNumber}` : ''}</div>
      </div>
      <h1 className="test-question-text">{question.text}</h1>

      {question.explanation && <p className="test-explanation">{question.explanation}</p>}

      {question.image && <QuestionImage name={question.image} />}

      {question.instructions?.length > 0 && (
        <ol className="test-question-instructions">
          {question.instructions.map((line, i) => (
            <li key={i}>{line}</li>
          ))}
        </ol>
      )}

      <div className="test-microlabel test-options-label">{MICROLABEL_BY_TYPE[question.type] || MICROLABEL_BY_TYPE.multiple_choice}</div>

      <QuestionAnswerInput
        question={question}
        examKey={attempt.examKey}
        value={value}
        onChange={() => {}}
        checked
        verdict={verdict}
        selfGrade={selfGradeValue}
        onSelfGradePart={() => {}}
        partIndex={partIndex}
        onPartIndexChange={setPartIndex}
      />

      {verdict === 'correct' && <div className="test-feedback correct">{pointsNote || 'Верно.'}</div>}
      {verdict === 'partial' && (
        <div className="test-feedback partial">{pointsNote || 'Частично верно — упущенные или лишние места отмечены оранжевым.'}</div>
      )}
      {verdict === 'incorrect' && (
        <div className="test-feedback incorrect">
          {pointsNote || (hasAnswer(question, value) ? 'Неверно. Правильный ответ показан выше.' : 'Вы не ответили на этот вопрос.')}
        </div>
      )}
      {verdict === 'ungraded' && (
        <div className="test-feedback ungraded">
          {typeof selfGradeValue === 'string' ? (
            <p>Вы отметили этот ответ сами как «{SELF_GRADE_LABEL[selfGradeValue] || selfGradeValue}».</p>
          ) : (
            <p>Это задание не проверяется автоматически, и вы не отметили результат сами при прохождении.</p>
          )}
        </div>
      )}
    </>
  )

  const passageCore = passage && (
    <>
      {passage.title && <h3>{passage.title}</h3>}
      <div className="test-passage-text">{passage.text}</div>
    </>
  )

  return (
    <>
      <div className={'test-page' + (sidebarCollapsed ? ' nav-collapsed' : '')}>
        <aside className={'test-nav' + (sidebarCollapsed ? ' collapsed' : '')}>
          {sidebarCollapsed ? (
            <button
              type="button"
              className="test-nav-expand"
              onClick={() => setSidebarCollapsed(false)}
              aria-label="Развернуть список вопросов"
              title="Развернуть список вопросов"
            >
              »
            </button>
          ) : (
            <>
              <div className="test-nav-top">
                <div>
                  <button className="test-nav-back" onClick={() => navigate('/my-learning')}>
                    ← Мой прогресс
                  </button>
                  <h2 className="test-nav-title">{attempt.testTitle}</h2>
                </div>
              </div>

              <div className="test-nav-progress-label">
                Пройдено {formatDate(attempt.completedAt)}
                {attempt.scorePercent != null && <> · {attempt.scorePercent}%</>}
              </div>
              <div className="test-progress-bar">
                <div
                  className="test-progress-bar-fill"
                  style={{ width: `${attempt.scorePercent ?? 0}%`, background: exam.color }}
                />
              </div>
              <div className="test-nav-progress-label">
                Верно: <b>{attempt.correctCount}</b>
                {attempt.partialCount > 0 && <> · частично: <b>{attempt.partialCount}</b></>}
                {' '}· неверно: <b>{attempt.incorrectCount}</b>
                {attempt.ungradedCount > 0 && <> · не проверяется: <b>{attempt.ungradedCount}</b></>}
                {' '}из {attempt.totalQuestions}
              </div>

              {groups.map((group) => (
                <div className="question-group" key={group.name}>
                  <div className="question-group-label">{group.name}</div>
                  <div className="question-grid">
                    {group.items.map(({ question: q, index: i }) => {
                      const classes = ['q-num', verdictFor(q)]
                      if (i === index) classes.push('current')
                      return (
                        <button key={q.id} className={classes.join(' ')} onClick={() => goTo(i)}>
                          {i + 1}
                        </button>
                      )
                    })}
                  </div>
                </div>
              ))}

              <Link className="btn btn-outline test-finish-btn" to={`/${attempt.examKey}/test/${attempt.testId}`}>
                Пройти этот пробник заново
              </Link>

              <button
                type="button"
                className="test-nav-collapse"
                onClick={() => setSidebarCollapsed(true)}
                title="Свернуть список вопросов"
              >
                « Свернуть меню
              </button>
            </>
          )}
        </aside>

        <section className="test-main">
          {passage && (
            <div className="test-view-switch">
              <button type="button" className={'test-view-tab' + (view === 'text' ? ' active' : '')} onClick={() => setView('text')}>
                📖 Текст
              </button>
              <button type="button" className={'test-view-tab' + (view === 'question' ? ' active' : '')} onClick={() => setView('question')}>
                Задание
              </button>
              <button
                type="button"
                className={'test-view-tab test-view-float-btn' + (floatingOpen ? ' active' : '')}
                onClick={() => {
                  setFloatingOpen(true)
                  setView('question')
                }}
                title="Открыть текст в отдельном окне — можно двигать и менять размер"
                aria-label="Открыть текст в отдельном окне"
              >
                ⧉
              </button>
            </div>
          )}

          {passage && view === 'text' ? (
            <div className="test-passage-full">{passageCore}</div>
          ) : (
            <div className="test-question-block">{questionCore}</div>
          )}

          <div className="test-actions">
            <button className="btn btn-outline" disabled={isFirst} onClick={handlePrev}>
              ← Назад
            </button>
            {!isLast || (isPaginatedMultiPart && partIndex < question.parts.length - 1) ? (
              <button className="btn btn-primary" onClick={handleNext}>
                Далее →
              </button>
            ) : (
              <Link className="btn btn-primary" to="/my-learning">
                Готово
              </Link>
            )}
          </div>
        </section>
      </div>

      {floatingOpen && passage && <FloatingPassageWindow passage={passage} onClose={() => setFloatingOpen(false)} />}
    </>
  )
}
