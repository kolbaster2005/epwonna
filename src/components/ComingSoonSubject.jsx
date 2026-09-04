import { Link } from 'react-router-dom'
import ExamIcon from './ExamIcon.jsx'

// Lightweight placeholder for subjects that don't have any real content
// yet (no probniks, no task bank) — Geschichte / Physik / Chemie /
// Biologie for now. Deliberately much simpler than ExamPage.jsx: no
// tabs, no filters, no test grid — just an explanation and a link to
// wherever materials currently live, until the real section is built.
export default function ComingSoonSubject({ subject }) {
  const hasRealLink = subject.materialsUrl && subject.materialsUrl !== '#'

  return (
    <div className="exam-hero">
      <div className="exam-top">
        <div className="exam-tag" style={{ background: subject.color }}>
          <ExamIcon examKey={subject.key} size={22} />
        </div>
        <div className="exam-title">
          <h1>{subject.title}</h1>
          <p>{subject.label}</p>
        </div>
      </div>

      <div className="coming-soon-card">
        <p className="coming-soon-lead">Этот раздел пока на этапе разработки — пробников и заданий здесь ещё нет.</p>
        {hasRealLink ? (
          <a className="btn btn-primary" href={subject.materialsUrl} target="_blank" rel="noreferrer">
            Материалы для подготовки →
          </a>
        ) : (
          <p className="coming-soon-note">Ссылка на материалы для подготовки появится здесь совсем скоро.</p>
        )}
      </div>

      <Link className="btn btn-outline" to="/">← На главную</Link>
    </div>
  )
}
