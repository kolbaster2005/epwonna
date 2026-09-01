// Looks up a small inline SVG diagram OR a real cropped-from-the-exam
// photo by name (see REAL_PHOTOS below) for questions that have
// question.image set to one of these named keys. Anything else — a
// data: URI from the admin panel's photo upload, or a real https:// URL
// once Supabase Storage is wired up — is rendered as a plain <img>, so
// all three cases share one prop.

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'

import epmAbschluss2Q5 from '../assets/questions/epm-abschluss-2-q5.jpg'
import epmAbschluss2Q7 from '../assets/questions/epm-abschluss-2-q7.jpg'
import epdSchreiben2 from '../assets/questions/epd-musterpruefung-1-schreiben2.jpg'
import epdStruktur1Beispiel from '../assets/questions/epd-musterpruefung-1-struktur-a1-beispiel.jpg'
import epdStruktur2Beispiel from '../assets/questions/epd-musterpruefung-1-struktur-a2-beispiel.jpg'
import epdOralModel1Grafik from '../assets/oral/epd-oral-model-1-grafik.jpg'
import epdOralModel1Karikatur from '../assets/oral/epd-oral-model-1-karikatur.jpg'
import epdOralModel1Bildimpuls from '../assets/oral/epd-oral-model-1-bildimpuls.jpg'
import epdOralModel1_2bGrafik from '../assets/oral/epd-oral-model-1-2b-grafik.jpg'
import epeSample1WritingBlog from '../assets/questions/epe-sample-1-writing-blog.jpg'
import epeOralSample1 from '../assets/oral/epe-oral-sample-1.jpg'
import epeOralSample2 from '../assets/oral/epe-oral-sample-2.jpg'

// Real photos (crops from the person's uploaded exam scans), imported as
// static assets like exam-hero images — not stored as giant base64 blobs
// in the database.
const REAL_PHOTOS = {
  'epm-abschluss-2-q5': epmAbschluss2Q5,
  'epm-abschluss-2-q7': epmAbschluss2Q7,
  'epd-musterpruefung-1-schreiben2': epdSchreiben2,
  'epd-musterpruefung-1-struktur-a1-beispiel': epdStruktur1Beispiel,
  'epd-musterpruefung-1-struktur-a2-beispiel': epdStruktur2Beispiel,
  'epd-oral-model-1-grafik': epdOralModel1Grafik,
  'epd-oral-model-1-karikatur': epdOralModel1Karikatur,
  'epd-oral-model-1-bildimpuls': epdOralModel1Bildimpuls,
  'epd-oral-model-1-2b-grafik': epdOralModel1_2bGrafik,
  'epe-sample-1-writing-blog': epeSample1WritingBlog,
  'epe-oral-sample-1': epeOralSample1,
  'epe-oral-sample-2': epeOralSample2,
}

function TriangleAbc() {
  return (
    <svg viewBox="0 0 300 200" width="100%" height="auto" role="img" aria-label="Треугольник ABC">
      <polygon points="40,170 260,170 130,30" fill="none" stroke="var(--blue)" strokeWidth="3" strokeLinejoin="round" />
      <text x="24" y="185" fontSize="16" fontWeight="700" fill="var(--ink)">A</text>
      <text x="266" y="185" fontSize="16" fontWeight="700" fill="var(--ink)">B</text>
      <text x="122" y="22" fontSize="16" fontWeight="700" fill="var(--ink)">C</text>
      <path d="M60 170 A 22 22 0 0 1 74 152" fill="none" stroke="var(--blue)" strokeWidth="2" />
      <text x="62" y="150" fontSize="13" fill="var(--ink-soft)">50°</text>
      <path d="M240 170 A 22 22 0 0 0 222 154" fill="none" stroke="var(--blue)" strokeWidth="2" />
      <text x="205" y="150" fontSize="13" fill="var(--ink-soft)">70°</text>
    </svg>
  )
}

// Density function f(x): 0 for x ≤ -1, rises to a peak at x = 0, falls
// linearly to 0 at x = 4, 0 for x > 4. The peak's height (h) is
// deliberately left unlabeled — that's what the question asks the
// person to work out, same as in the source exam.
function DensityTriangle() {
  const xToPx = (x) => 40 + (x + 2) * 60 // maps x ∈ [-2, 5] to pixel space
  const baseline = 200
  const peak = 120
  const ticks = [-2, -1, 0, 1, 2, 3, 4, 5]

  return (
    <svg viewBox="0 0 500 230" width="100%" height="auto" role="img" aria-label="График плотности вероятности f">
      {/* axes */}
      <line x1={20} y1={baseline} x2={480} y2={baseline} stroke="var(--ink-soft)" strokeWidth="1.5" />
      <polygon points={`480,${baseline - 5} 490,${baseline} 480,${baseline + 5}`} fill="var(--ink-soft)" />
      <line x1={xToPx(0)} y1={20} x2={xToPx(0)} y2={baseline} stroke="var(--ink-soft)" strokeWidth="1.5" />
      <polygon points={`${xToPx(0) - 5},28 ${xToPx(0) + 5},28 ${xToPx(0)},18`} fill="var(--ink-soft)" />
      <text x={492} y={baseline + 4} fontSize="13" fontStyle="italic" fill="var(--ink-soft)">x</text>

      {/* tick marks + labels */}
      {ticks.map((x) => (
        <g key={x}>
          <line x1={xToPx(x)} y1={baseline - 4} x2={xToPx(x)} y2={baseline + 4} stroke="var(--ink-soft)" strokeWidth="1.5" />
          {x !== 0 && (
            <text x={xToPx(x)} y={baseline + 20} fontSize="12" textAnchor="middle" fill="var(--ink-soft)">{x}</text>
          )}
        </g>
      ))}
      <text x={xToPx(0) - 8} y={baseline + 20} fontSize="12" textAnchor="end" fill="var(--ink-soft)">0</text>

      {/* the density function itself */}
      <polyline
        points={`${xToPx(-2)},${baseline} ${xToPx(-1)},${baseline} ${xToPx(0)},${peak} ${xToPx(4)},${baseline} ${xToPx(5)},${baseline}`}
        fill="none"
        stroke="var(--ink)"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
    </svg>
  )
}

const IMAGES = {
  'triangle-abc': TriangleAbc,
  'density-triangle': DensityTriangle,
}

// Click a photo to see it at full size, in a fullscreen overlay — most
// useful for exam scans/diagrams that are hard to read at the width a
// question card gives them. Not used for the generated SVG diagrams
// above (TriangleAbc/DensityTriangle) — those are already crisp vectors
// at any size, nothing to zoom into.
function ZoomableImage({ src, alt }) {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!open) return undefined
    function handleKey(e) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [open])

  return (
    <>
      <button type="button" className="question-image-trigger" onClick={() => setOpen(true)}>
        <img src={src} alt={alt} />
      </button>

      {open &&
        createPortal(
          <div className="image-lightbox-overlay" onClick={() => setOpen(false)}>
            <button type="button" className="image-lightbox-close" onClick={() => setOpen(false)} aria-label="Закрыть">
              ✕
            </button>
            <img src={src} alt={alt} className="image-lightbox-img" onClick={(e) => e.stopPropagation()} />
          </div>,
          document.body
        )}
    </>
  )
}

export default function QuestionImage({ name }) {
  if (!name) return null

  const realPhoto = REAL_PHOTOS[name]
  if (realPhoto) {
    return (
      <div className="question-image">
        <ZoomableImage src={realPhoto} alt="Иллюстрация к вопросу" />
      </div>
    )
  }

  const Component = IMAGES[name]
  if (Component) {
    return (
      <div className="question-image">
        <Component />
      </div>
    )
  }

  return (
    <div className="question-image">
      <ZoomableImage src={name} alt="Иллюстрация к вопросу" />
    </div>
  )
}
