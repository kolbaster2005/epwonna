import { Link } from 'react-router-dom'
import { examList } from '../../data/examData.js'
import ExamIcon from '../../components/ExamIcon.jsx'

// No role check yet — see the note in Header.jsx. Once Supabase Auth is
// wired up, this whole /admin subtree should be wrapped in a route guard
// that redirects anyone without the admin role.
export default function AdminHome() {
  return (
    <div className="admin-page">
      <div className="admin-header">
        <h1>Админка</h1>
        <p>Выберите раздел, чтобы управлять пробниками и вопросами.</p>
      </div>

      <Link className="btn btn-outline admin-reports-link" to="/admin/reports">
        Обращения по вопросам
      </Link>

      <div className="admin-section-grid">
        {examList.map((exam) => (
          <Link className={`admin-section-card ${exam.className}`} to={`/admin/${exam.key}`} key={exam.key}>
            <div className="test-icon-badge large">
              <ExamIcon examKey={exam.key} color={exam.color} size={26} />
            </div>
            <h3>{exam.label}</h3>
            <p>{exam.homeTitle}</p>
          </Link>
        ))}
      </div>
    </div>
  )
}
