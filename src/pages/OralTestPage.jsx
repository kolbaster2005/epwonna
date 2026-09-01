import { useEffect, useRef, useState } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import { exams } from '../data/examData.js'
import { getTest } from '../services/testsService.js'
import QuestionImage from '../components/QuestionImage.jsx'
import { IconImage, IconMic } from '../components/Icons.jsx'

function formatTime(totalSeconds) {
  const s = Math.max(0, totalSeconds)
  const m = Math.floor(s / 60)
  const r = s % 60
  return `${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}`
}

// Renders whatever the stage/option gives the person to work with — a
// quote, a text excerpt, a real photo/chart, or (if no real image has
// been added yet) a placeholder card.
function Material({ item }) {
  if (item.kind === 'quote') {
    return <blockquote className="oral-quote">{item.content}</blockquote>
  }
  if (item.kind === 'text') {
    return (
      <div className="oral-text-excerpt">
        {item.label && <h3>{item.label}</h3>}
        <div className="oral-text-excerpt-body">{item.content}</div>
      </div>
    )
  }
  if (item.kind === 'image' && item.image) {
    return <QuestionImage name={item.image} />
  }
  return (
    <div className="oral-photo-placeholder">
      <IconImage size={28} />
      <span>{item.label || (item.kind === 'chart' ? 'График' : 'Фотография')}</span>
    </div>
  )
}

// Small preview shown right on the picker card, before a card is chosen —
// a real thumbnail for images, a short text snippet otherwise. Purely
// cosmetic (helps tell the 4 demo options apart at a glance).
function ChoiceCardPreview({ opt }) {
  if (opt.kind === 'image' && opt.image) {
    return (
      <div className="oral-choice-thumb">
        <QuestionImage name={opt.image} />
      </div>
    )
  }
  if (opt.content) {
    const snippet = opt.content.length > 110 ? `${opt.content.slice(0, 110)}…` : opt.content
    return <p className="oral-choice-preview">{opt.kind === 'quote' ? `„${snippet}“` : snippet}</p>
  }
  return null
}

export default function OralTestPage({ examKey }) {
  const { testId } = useParams()
  const navigate = useNavigate()
  const exam = exams[examKey]

  const [test, setTest] = useState(undefined)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    getTest(examKey, testId).then((data) => {
      if (!cancelled) {
        setTest(data)
        setLoading(false)
      }
    })
    return () => {
      cancelled = true
    }
  }, [examKey, testId])

  // Shown once at the start of every attempt (not remembered across
  // visits — showing it every time was a deliberate simplification, so
  // there's no risk of someone missing it because a past visit
  // dismissed it for good).
  const [introSeen, setIntroSeen] = useState(false)

  const stages = test?.oralTask?.stages || []
  const [stageIndex, setStageIndex] = useState(0)
  const [phase, setPhase] = useState('intro') // 'intro' (choice pending) | 'prep' | 'present'
  const [chosenId, setChosenId] = useState(null)
  const [secondsLeft, setSecondsLeft] = useState(0)
  const [paused, setPaused] = useState(false)
  const [done, setDone] = useState(false)
  const intervalRef = useRef(null)

  const stage = stages[stageIndex]

  // Reset per-stage state whenever we move to a new stage.
  useEffect(() => {
    if (!stage) return
    setPaused(false)
    const singleOption = stage.kind === 'choice' && stage.options?.length === 1 ? stage.options[0] : null
    if (singleOption) {
      // Nothing to actually choose between — go straight to prep/present
      // with that one card, same as if the person had picked it.
      setChosenId(singleOption.id)
      if (stage.prepMinutes > 0) {
        setSecondsLeft(stage.prepMinutes * 60)
        setPhase('prep')
      } else {
        setPhase('present')
      }
    } else if (stage.kind === 'choice') {
      setChosenId(null)
      setPhase('intro')
      setSecondsLeft(0)
    } else {
      setChosenId(null)
      setSecondsLeft((stage.prepMinutes || 0) * 60)
      setPhase(stage.prepMinutes > 0 ? 'prep' : 'present')
    }
  }, [stageIndex, stage])

  useEffect(() => {
    if (phase !== 'prep' || paused) return undefined
    intervalRef.current = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          clearInterval(intervalRef.current)
          setPhase('present')
          return 0
        }
        return s - 1
      })
    }, 1000)
    return () => clearInterval(intervalRef.current)
  }, [phase, paused])

  if (loading) {
    return <div className="tests-empty">Загрузка пробника…</div>
  }

  if (!test || !test.oralTask) {
    return (
      <div className="test-missing">
        <h1>Пробник не найден</h1>
        <p>Возможно, ссылка устарела.</p>
        <Link className="btn btn-primary" to={`/${examKey}`}>Вернуться к пробникам</Link>
      </div>
    )
  }

  function chooseOption(opt) {
    setChosenId(opt.id)
    if (stage.prepMinutes > 0) {
      setSecondsLeft(stage.prepMinutes * 60)
      setPhase('prep')
    } else {
      setPhase('present')
    }
  }

  function backToChoice() {
    clearInterval(intervalRef.current)
    setPaused(false)
    setChosenId(null)
    setPhase('intro')
  }

  function nextStage() {
    if (stageIndex < stages.length - 1) {
      setStageIndex((i) => i + 1)
    } else {
      setDone(true)
    }
  }

  const chosenOption = stage?.kind === 'choice' ? stage.options.find((o) => o.id === chosenId) : null
  const materials = stage?.kind === 'choice' ? (chosenOption ? [chosenOption] : []) : stage?.materials || []
  const prompt = chosenOption?.prompt || stage?.prompt
  const leitfragen = chosenOption?.leitfragen || stage?.leitfragen

  const disclaimer = (
    <div className="oral-disclaimer">
      Функция автоматической проверки будет доступна позже. В данный момент проект находится на этапе запуска.
    </div>
  )

  if (done) {
    return (
      <div className="test-results">
        <div className="test-results-score" style={{ background: exam.color }}>
          <IconMic size={34} color="#fff" />
        </div>
        <h1>Устная часть пройдена</h1>
        <p>Вы прошли все этапы устной части «{test.title}».</p>
        <div className="test-results-actions">
          <Link className="btn btn-outline" to={`/${examKey}/probnik/${test.id}`}>К пробнику</Link>
          <Link className="btn btn-primary" to={`/${examKey}`}>Вернуться к пробникам</Link>
        </div>
        {disclaimer}
      </div>
    )
  }

  if (!introSeen) {
    return (
      <div className="oral-page">
        <button className="test-nav-back" onClick={() => navigate(`/${examKey}/probnik/${test.id}`)}>
          ← {test.title}
        </button>

        <div className="oral-intro-screen">
          {test.isModel && (
            <p className="oral-intro-model-note">
              Важно: на самом экзамене нужно выбрать из двух карточек, но здесь, в модели экзамена, можно
              ознакомиться со всеми возможными типами заданий.
            </p>
          )}
          <div className="oral-intro-text">{exam.oralExamInfo}</div>
          <div className="oral-intro-actions">
            <button className="btn btn-primary" onClick={() => setIntroSeen(true)}>
              Далее →
            </button>
          </div>
        </div>

        {disclaimer}
      </div>
    )
  }

  return (
    <div className="oral-page">
      <button className="test-nav-back" onClick={() => navigate(`/${examKey}/probnik/${test.id}`)}>
        ← {test.title}
      </button>

      <div className="oral-stage-pill">Этап {stageIndex + 1} из {stages.length}</div>
      <h1 className="oral-stage-title">{stage.title}</h1>
      <p className="oral-instructions">{stage.instructions}</p>

      {phase === 'intro' && stage.kind === 'choice' && (
        <div className="oral-choice-grid">
          {stage.options.map((opt) => (
            <button className="oral-choice-card" key={opt.id} onClick={() => chooseOption(opt)}>
              <h3>{opt.label}</h3>
              <ChoiceCardPreview opt={opt} />
            </button>
          ))}
        </div>
      )}

      {phase !== 'intro' && (
        <div className="oral-workspace">
          {stage.kind === 'choice' && stage.options?.length > 1 && (
            <button type="button" className="oral-back-to-choice" onClick={backToChoice}>
              ← Выбрать другую тему
            </button>
          )}

          <div className={'oral-materials' + (materials.length > 1 ? ' multi' : '')}>
            {materials.map((m) => (
              <Material item={m} key={m.id} />
            ))}
          </div>

          {prompt && <p className="oral-prompt">{prompt}</p>}
          {leitfragen?.length > 0 && (
            <ol className="oral-leitfragen">
              {leitfragen.map((line, i) => (
                <li key={i}>{line}</li>
              ))}
            </ol>
          )}

          {phase === 'prep' && (
            <div className="oral-prep-panel">
              <div className="oral-prep-timer">
                <span className="oral-prep-timer-value">{formatTime(secondsLeft)}</span>
                <span className="oral-prep-timer-label">на подготовку</span>
              </div>
              <div className="oral-prep-actions">
                <button className="btn btn-outline" onClick={() => setPaused((p) => !p)}>
                  {paused ? 'Продолжить' : 'Пауза'}
                </button>
                <button className="btn btn-primary" onClick={() => setPhase('present')}>
                  Пропустить подготовку
                </button>
              </div>
            </div>
          )}

          {phase === 'present' && (
            <div className="oral-present-panel">
              <p className="oral-present-note">
                <IconMic size={16} /> Время на подготовку закончилось — представьте свой ответ.
              </p>
              <button className="btn btn-primary" onClick={nextStage}>
                {stageIndex < stages.length - 1 ? 'Далее →' : 'Завершить устную часть'}
              </button>
            </div>
          )}
        </div>
      )}

      {disclaimer}
    </div>
  )
}
