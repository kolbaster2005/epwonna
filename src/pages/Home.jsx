import { Link } from 'react-router-dom'
import ExamIcon from '../components/ExamIcon.jsx'
import { examList, comingSoonSubjects } from '../data/examData.js'
import { IconGraduationCap, IconBook } from '../components/Icons.jsx'
import heroIllustration from '../assets/hero-illustration.png'

const HERO_TILES = [
  { icon: IconGraduationCap, title: 'Моё обучение', desc: 'Отслеживай свой прогресс', to: '/my-learning' },
  { icon: IconBook, title: 'Словарь', desc: 'Учи новые слова', to: '/dictionary' },
]

export default function Home() {
  const heroTiles = (
    <div className="hero-tiles">
      {HERO_TILES.map((t) => (
        <Link className="hero-tile" to={t.to} key={t.title}>
          <div className="feature-icon"><t.icon size={20} /></div>
          <div>
            <h4>{t.title}</h4>
            <p>{t.desc}</p>
          </div>
        </Link>
      ))}
    </div>
  )

  return (
    <>
      <div className="hero">
        <div className="hero-grid">
          <div className="hero-heading-block">
            <h1>
              Всё о EP экзаменах — <span className="accent">бесплатно</span> и в одном месте
            </h1>
            <p className="lead">
              EP WONNA — это бесплатная онлайн-платформа для подготовки к австрийским EPх экзаменам. У нас ты
              найдёшь всё необходимое: официальные пробники, материалы для подготовки, информацию об экзаменах и
              многое другое.
            </p>

            {/* Desktop position — right under the lead text. Hidden below
                $bp-lg, where the mobile-position copy below takes over
                instead (see _home.scss: .hero-tiles-desktop-only /
                .hero-tiles-mobile-only). Same markup, just shown in a
                different spot per breakpoint — simpler and more robust
                than fighting grid-area reordering for this. */}
            <div className="hero-tiles-desktop-only">{heroTiles}</div>
          </div>

          <div className="hero-art">
            <div className="blob" />
            <img src={heroIllustration} alt="" className="hero-art-img" />
          </div>

          {/* Mobile position — after the photo, before the exam quicklinks. */}
          <div className="hero-tiles-mobile-only">{heroTiles}</div>

          {/* Mobile/tablet only (hidden from $bp-lg up, see _home.scss) —
              gets people straight to a subject with one tap, without
              having to scroll past the illustration and the big cards
              first. Desktop already has the header dropdown for that. */}
          <div className="hero-quicknav">
            {examList.map((exam) => (
              <Link className={`hero-quicknav-item ${exam.className}`} to={`/${exam.key}`} key={exam.key}>
                <span className="hero-quicknav-label">{exam.label}</span>
                <span className="hero-quicknav-cta">Перейти к материалам →</span>
              </Link>
            ))}
            <div className="hero-quicknav-divider">Скоро на платформе</div>
            {comingSoonSubjects.map((subject) => (
              <Link className={`hero-quicknav-item ${subject.className}`} to={`/${subject.key}`} key={subject.key}>
                <span className="hero-quicknav-label">{subject.label}</span>
                <span className="hero-quicknav-cta">Подробнее →</span>
              </Link>
            ))}
          </div>
        </div>
      </div>

      <div>
        <div className="directions-grid">
          {examList.map((exam) => (
            <Link className={`dir-card ${exam.className}`} to={`/${exam.key}`} key={exam.key}>
              <div className="dir-card-head">
                <div className="dir-icon"><ExamIcon examKey={exam.key} /></div>
                <div>
                  <div className="sub">{exam.label}</div>
                  <h3>{exam.homeTitle}</h3>
                </div>
              </div>
              <p className="desc">{exam.homeDesc}</p>
              <span className="goto">Перейти к материалам →</span>
              <span className="watermark">{exam.label}</span>
            </Link>
          ))}
        </div>
      </div>

      {/* Subjects with no real content yet — see comingSoonSubjects in
          examData.js. Kept in its own section with its own heading so
          it reads as clearly separate from the three real exams above,
          not as a fourth/fifth/sixth equally-ready option. */}
      <div className="coming-soon-section">
        <h2 className="coming-soon-section-title">Скоро на платформе</h2>
        <div className="directions-grid">
          {comingSoonSubjects.map((subject) => (
            <Link className={`dir-card ${subject.className}`} to={`/${subject.key}`} key={subject.key}>
              <div className="dir-card-head">
                <div className="dir-icon"><ExamIcon examKey={subject.key} /></div>
                <div>
                  <div className="sub">{subject.label}</div>
                  <h3>{subject.homeTitle}</h3>
                </div>
              </div>
              <p className="desc">{subject.homeDesc}</p>
              <span className="goto">Подробнее →</span>
              <span className="watermark">{subject.label}</span>
            </Link>
          ))}
        </div>
      </div>
    </>
  )
}
