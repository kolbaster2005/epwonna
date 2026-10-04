import { visibleExamList } from '../data/examData.js'
import { useAuth } from '../contexts/AuthContext.jsx'
import { usePersonalization } from '../contexts/PersonalizationContext.jsx'
import ExamIcon from '../components/ExamIcon.jsx'

// «Персонализация» — выбор курсов, которые показываются в левом меню, на
// главной и в подвале. Скрыть можно любой курс, кроме последнего
// оставшегося, чтобы главная не осталась совсем пустой.
export default function Personalization() {
  const { user } = useAuth()
  const { hiddenExams, setExamHidden } = usePersonalization()
  const exams = visibleExamList()
  const shownCount = exams.filter((e) => !hiddenExams.includes(e.key)).length

  return (
    <div className="mylearning-page personalization-page">
      <div className="admin-header">
        <div>
          <h1>Персонализация</h1>
          <p>Настройте кабинет под себя.</p>
        </div>
      </div>

      {!user ? (
        <p className="admin-note">Войдите, чтобы настроить кабинет.</p>
      ) : (
        <section className="personalization-section">
          <h2>Мои курсы</h2>
          <p className="personalization-hint">
            Выключенные курсы не будут показываться ни в меню, ни на главной. Включить их обратно можно в любой момент.
          </p>

          <ul className="personalization-list">
            {exams.map((exam) => {
              const shown = !hiddenExams.includes(exam.key)
              const isLastShown = shown && shownCount === 1
              return (
                <li key={exam.key}>
                  <label className={'personalization-item' + (shown ? '' : ' off') + (isLastShown ? ' locked' : '')}>
                    <span className="personalization-item-icon" style={{ background: exam.color }}>
                      <ExamIcon examKey={exam.key} size={20} />
                    </span>
                    <span className="personalization-item-body">
                      <b>{exam.label}</b>
                      <span>{isLastShown ? 'Хотя бы один курс должен остаться' : exam.homeTitle}</span>
                    </span>
                    <input
                      type="checkbox"
                      className="personalization-switch"
                      checked={shown}
                      disabled={isLastShown}
                      onChange={(e) => setExamHidden(exam.key, !e.target.checked)}
                    />
                  </label>
                </li>
              )
            })}
          </ul>
        </section>
      )}
    </div>
  )
}
