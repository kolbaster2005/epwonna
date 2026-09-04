import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { exams } from '../data/examData.js'
import { getTest } from '../services/testsService.js'
import ExamIcon from '../components/ExamIcon.jsx'
import { IconList, IconClock, IconShield, IconCalendar, IconHome, IconChevronRight, IconDownload } from '../components/Icons.jsx'
import { pluralizeRu } from '../utils/pluralize.js'

export default function TestDetailPage({ examKey }) {
  const { testId } = useParams()
  const exam = exams[examKey]
  const [test, setTest] = useState(undefined) // undefined = loading, null = not found
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setTest(undefined)
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

  if (loading) {
    return <div className="tests-empty">Загрузка пробника…</div>
  }

  if (!test) {
    return (
      <div className="test-missing">
        <h1>Пробник не найден</h1>
        <p>Возможно, ссылка устарела.</p>
        <Link className="btn btn-primary" to={`/${examKey}`}>Вернуться к пробникам</Link>
      </div>
    )
  }

  return (
    <div className="test-detail">
      <nav className="breadcrumb">
        <Link to="/" aria-label="Главная"><IconHome size={16} /></Link>
        <IconChevronRight size={14} className="breadcrumb-sep" />
        <Link to={`/${examKey}`}>Пробники</Link>
        <IconChevronRight size={14} className="breadcrumb-sep" />
        <span>{test.title}</span>
      </nav>

      <div className={`test-detail-card ${exam.className}`}>
        <div className="test-detail-left">
          <div className="test-icon-badge large">
            <ExamIcon examKey={examKey} color={exam.color} size={26} />
          </div>
          <h1>{test.title}</h1>

          {test.pdfUrl && (
            <a className="test-pdf-link" href={test.pdfUrl} target="_blank" rel="noreferrer">
              <IconDownload size={16} />
              Скачать пробник в PDF
            </a>
          )}

          <ul className="test-detail-meta">
            <li>
              <IconList size={17} />
              {test.format === 'oral'
                ? `${test.oralTask?.stages.length ?? 0} ${pluralizeRu(test.oralTask?.stages.length ?? 0, ['этап', 'этапа', 'этапов'])}`
                : `${test.questions.length} ${pluralizeRu(test.questions.length, ['задание', 'задания', 'заданий'])}`}
            </li>
            <li>
              <IconClock size={17} />
              {test.durationMinutes} минут на выполнение
            </li>
            <li>
              <IconShield size={17} />
              {test.isModel ? 'Модель экзамена' : test.isOfficial ? 'Официальный пробник' : 'Неофициальный пробник'}
            </li>
            <li>
              <IconCalendar size={17} />
              Актуален для экзамена {test.year} года
            </li>
          </ul>
        </div>

        <div className="test-detail-right">
          <h2>Описание</h2>
          <p>{test.fullDescription}</p>
          <Link
            className="btn btn-primary"
            style={{ background: exam.color }}
            to={test.format === 'oral' ? `/${examKey}/oral/${test.id}` : `/${examKey}/test/${test.id}`}
          >
            Начать
          </Link>
        </div>
      </div>
    </div>
  )
}
