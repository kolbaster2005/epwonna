import { Link } from 'react-router-dom'
import { universities } from '../data/universities.js'
import wuHero from '../assets/wu-hero.webp'
import uniwienHero from '../assets/uniwien-hero.jpg'
import tuwienHero from '../assets/tuwien-hero.jpg'

const HERO_IMAGES = {
  wu: wuHero,
  uniwien: uniwienHero,
  tuwien: tuwienHero,
}

export default function UniversityPage({ uniKey }) {
  const uni = universities.find((u) => u.key === uniKey)
  const heroImage = HERO_IMAGES[uniKey]

  return (
    <div className="simple-page">
      <div className="uni-layout">
        <div>
          <span className="wip-badge">В разработке</span>
          <h1>{uni.label}</h1>

          {heroImage && (
            <div className="uni-hero-art uni-hero-art-mobile">
              <img src={heroImage} alt={uni.fullName} />
            </div>
          )}

          <div className="about-text">
            <p>
              {uni.fullName} — {uni.shortDesc}. Скоро здесь появится подробная информация о вступительных экзаменах:
              как проходит поступление, какие документы нужны, из каких этапов состоит отбор и как к нему готовиться.
            </p>
            <p>
              Пока этот раздел пуст — если у вас уже есть материалы или ссылки по поступлению в {uni.label}, дайте знать,
              и мы соберём их здесь в первую очередь.
            </p>
          </div>
          <Link className="btn btn-outline" to="/">← На главную</Link>
        </div>

        {heroImage && (
          <div className="uni-hero-art uni-hero-art-desktop">
            <img src={heroImage} alt={uni.fullName} />
          </div>
        )}
      </div>
    </div>
  )
}
