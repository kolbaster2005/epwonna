// Decorative illustration for the top of the "Об экзамене" tab.
//
// EPM has a real illustration now (src/assets/epm-hero.svg — provided by
// the person, imported as a static asset so Vite hashes/caches it like
// any other build asset). EPD/EPE don't have their own images yet, so
// they still fall back to the generated placeholder scene below
// (clipboard/checklist, calculator, books, floating doodles) — swap this
// per-exam mapping for a real `import` once images for those exist too.
import epmHero from '../assets/epm-hero.svg'

const REAL_IMAGES = {
  epm: epmHero,
}

export default function ExamHeroArt({ examKey, exam }) {
  const realImage = REAL_IMAGES[examKey]
  if (realImage) {
    return (
      <div className="exam-hero-art exam-hero-art-image">
        <img src={realImage} alt={`Иллюстрация: ${exam.title}`} />
      </div>
    )
  }

  const { color, colorDark } = exam
  const SUBTITLE_BY_KEY = { epd: 'немецкий', epe: 'английский', chemie: 'химия', physik: 'физика' }
  const subtitle = SUBTITLE_BY_KEY[examKey] || exam.label

  return (
    <div className="exam-hero-art">
      <div className="blob" />
      <svg viewBox="0 0 460 400" xmlns="http://www.w3.org/2000/svg">
        <ellipse cx="230" cy="380" rx="150" ry="12" fill="#DCE6FF" opacity="0.5" />

        {/* Floating doodles */}
        <text x="26" y="55" fontFamily="Georgia, serif" fontSize="20" fontStyle="italic" fill={color} opacity="0.55">sin x</text>
        <text x="362" y="48" fontFamily="Georgia, serif" fontSize="19" fill={color} opacity="0.5">√x</text>
        <text x="340" y="145" fontFamily="Georgia, serif" fontSize="14" fill={color} opacity="0.5">a²+b²=c²</text>
        <path d="M398 185 L428 236 L368 236 Z" fill="none" stroke={color} strokeWidth="1.6" opacity="0.4" />
        <circle cx="55" cy="205" r="21" fill="none" stroke={color} strokeWidth="1.6" opacity="0.4" />
        <path d="M55 205 L55 184 A21 21 0 0 1 72.5 216 Z" fill={color} opacity="0.22" />

        {/* Book stack */}
        <rect x="278" y="298" width="150" height="24" rx="5" fill={colorDark} />
        <rect x="286" y="274" width="134" height="24" rx="5" fill={color} />
        <rect x="294" y="250" width="118" height="24" rx="5" fill="#B9CBFF" />

        {/* Calculator */}
        <rect x="38" y="248" width="118" height="128" rx="14" fill={colorDark} />
        <rect x="50" y="260" width="94" height="32" rx="6" fill="#fff" />
        <text x="97" y="282" fontFamily="'Manrope',sans-serif" fontWeight="700" fontSize="15" fill={colorDark} textAnchor="middle">3,14</text>
        {Array.from({ length: 9 }).map((_, i) => (
          <rect key={i} x={52 + (i % 3) * 31} y={302 + Math.floor(i / 3) * 22} width="21" height="14" rx="4" fill="#fff" opacity="0.85" />
        ))}

        {/* Clipboard */}
        <rect x="148" y="88" width="220" height="268" rx="16" fill={color} />
        <rect x="160" y="100" width="196" height="244" rx="10" fill="#F7F9FC" />
        <rect x="233" y="80" width="50" height="26" rx="8" fill={colorDark} />
        <circle cx="258" cy="93" r="6" fill="#fff" />

        <text x="258" y="138" textAnchor="middle" fontFamily="'Manrope',sans-serif" fontWeight="800" fontSize="16" fill={colorDark}>
          {exam.label} — {subtitle}
        </text>

        <path d="M178 188 Q206 148 226 172 T276 158 T326 138" fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" />

        {[218, 253, 288].map((y, i) => (
          <g key={i}>
            <circle cx="183" cy={y} r="9" fill={color} />
            <path d={`M179 ${y} l3 3 6-6`} stroke="#fff" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
            <rect x="200" y={y - 4} width="138" height="8" rx="4" fill="#DCE6FF" />
          </g>
        ))}

        {/* Pen */}
        <rect x="326" y="328" width="88" height="11" rx="5.5" fill={colorDark} transform="rotate(-20 326 328)" />
      </svg>
    </div>
  )
}
