import { visibleExamList } from '../data/examData.js'
import { useAuth } from '../contexts/AuthContext.jsx'
import { usePersonalization } from '../contexts/PersonalizationContext.jsx'
import ExamIcon from '../components/ExamIcon.jsx'

// Варианты оформления подвала — ключи совпадают с FOOTER_THEMES в
// PersonalizationContext.jsx и модификаторами .site-footer--* в
// _pro-dashboard.scss.
const FOOTER_THEME_OPTIONS = [
  { value: 'light', label: 'Светлый', desc: 'Светло-серый фон, тёмный текст' },
  { value: 'green', label: 'Тёмно-зелёный', desc: 'В цвет левого меню, белый текст' },
  { value: 'graphite', label: 'Графит', desc: 'Тёмно-серый фон, белый текст' },
]

// «Персонализация» — выбор курсов, которые показываются в левом меню, на
// главной и в подвале, и оформление подвала. Скрыть можно любой курс,
// кроме последнего оставшегося, чтобы главная не осталась совсем пустой.
export default function Personalization() {
  const { user, isAdmin } = useAuth()
  const { hiddenExams, setExamHidden, footerTheme, setFooterTheme } = usePersonalization()
  const exams = visibleExamList(isAdmin)
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

          <h2 className="personalization-subtitle">Оформление подвала</h2>
          <p className="personalization-hint">Цвет нижней части сайта. Меняется сразу — прокрутите страницу вниз, чтобы посмотреть.</p>
          <div className="personalization-themes" role="radiogroup" aria-label="Оформление подвала">
            {FOOTER_THEME_OPTIONS.map((opt) => (
              <label className={'personalization-theme' + (footerTheme === opt.value ? ' active' : '')} key={opt.value}>
                <input
                  type="radio"
                  name="footer-theme"
                  value={opt.value}
                  checked={footerTheme === opt.value}
                  onChange={() => setFooterTheme(opt.value)}
                />
                <span className={`personalization-theme-swatch ${opt.value}`} aria-hidden="true">
                  <i />
                  <i />
                </span>
                <b>{opt.label}</b>
                <span>{opt.desc}</span>
              </label>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
