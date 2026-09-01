import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { exams } from '../data/examData.js'
import { getTest } from '../services/testsService.js'
import { getAttempt } from '../services/attemptsService.js'
import QuestionImage from '../components/QuestionImage.jsx'
import QuestionAnswerInput from '../components/QuestionAnswerInput.jsx'
import { getVerdictWithSelfGrade, defaultValue } from '../utils/grading.js'

function formatDate(iso) {
  return new Date(iso).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

const VERDICT_LABEL = { correct: 'Верно', partial: 'Частично', incorrect: 'Неверно', ungraded: 'Не проверяется' }

export default function AttemptReview() {
  const { attemptId } = useParams()
  const [attempt, setAttempt] = useState(undefined) // undefined = loading, null = not found
  const [test, setTest] = useState(null)

  useEffect(() => {
    let cancelled = false
    getAttempt(attemptId).then(async (a) => {
      if (cancelled) return
      setAttempt(a)
      if (a) {
        const t = await getTest(a.examKey, a.testId)
        if (!cancelled) setTest(t)
      }
    })
    return () => {
      cancelled = true
    }
  }, [attemptId])

  if (attempt === undefined) {
    return <div className="mylearning-page"><p className="admin-note">Загрузка…</p></div>
  }

  if (!attempt || !test) {
    return (
      <div className="mylearning-page">
        <p className="admin-note">Эта попытка не найдена — возможно, пробник с тех пор был удалён.</p>
        <Link className="btn btn-outline" to="/my-learning">← К моему прогрессу</Link>
      </div>
    )
  }

  const exam = exams[attempt.examKey]
  const answers = attempt.answersSnapshot?.answers || {}
  const selfGrades = attempt.answersSnapshot?.selfGrades || {}
  const hasSnapshot = !!attempt.answersSnapshot

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

      {!hasSnapshot ? (
        <p className="admin-note">
          Для этой попытки не сохранён снимок ответов (она была пройдена до появления этой функции) — доступны
          только итоговые цифры на странице «Мой прогресс».
        </p>
      ) : (
        <div className="attempt-review-list">
          {test.questions.map((q, i) => {
            const value = answers[q.id] ?? defaultValue(q.type)
            const verdict = getVerdictWithSelfGrade(q, value, selfGrades[q.id])
            return (
              <div className="attempt-review-item" key={q.id}>
                <div className="attempt-review-item-head">
                  <span className="test-microlabel">Вопрос {i + 1}</span>
                  {verdict && <span className={`multi-part-verdict ${verdict}`}>{VERDICT_LABEL[verdict]}</span>}
                </div>
                <h3 className="test-question-text">{q.text}</h3>
                {q.image && <QuestionImage name={q.image} />}

                <QuestionAnswerInput
                  question={q}
                  value={value}
                  onChange={() => {}}
                  checked
                  verdict={verdict}
                  selfGrade={selfGrades[q.id]}
                  onSelfGradePart={() => {}}
                />
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
