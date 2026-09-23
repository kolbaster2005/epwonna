// Looks up a small inline SVG diagram OR a real cropped-from-the-exam
// photo by name (see REAL_PHOTOS below) for questions that have
// question.image set to one of these named keys. Anything else — a
// data: URI from the admin panel's photo upload, or a real https:// URL
// once Supabase Storage is wired up — is rendered as a plain <img>, so
// all three cases share one prop.

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'

import epmAbschluss2Q5 from '../assets/questions/epm-abschluss-2-q5.jpg'
import epmAbschluss10Q1 from '../assets/questions/epm-abschluss-10-q1.jpg'
import epmAbschluss10Q2 from '../assets/questions/epm-abschluss-10-q2.jpg'
import epmAbschluss10Q5 from '../assets/questions/epm-abschluss-10-q5.jpg'
import epmAbschluss11Q1 from '../assets/questions/epm-abschluss-11-q1.jpg'
import epmAbschluss11Q2 from '../assets/questions/epm-abschluss-11-q2.jpg'
import epmAbschluss11Q5 from '../assets/questions/epm-abschluss-11-q5.jpg'
import epmAbschluss2Q7 from '../assets/questions/epm-abschluss-2-q7.jpg'
import epdSchreiben2 from '../assets/questions/epd-musterpruefung-1-schreiben2.jpg'
import epdStruktur1Beispiel from '../assets/questions/epd-musterpruefung-1-struktur-a1-beispiel.jpg'
import epdStruktur2Beispiel from '../assets/questions/epd-musterpruefung-1-struktur-a2-beispiel.jpg'
import epdOralModel1Grafik from '../assets/oral/epd-oral-model-1-grafik.jpg'
import epdOralModel1Karikatur from '../assets/oral/epd-oral-model-1-karikatur.jpg'
import epdOralModel1Bildimpuls from '../assets/oral/epd-oral-model-1-bildimpuls.jpg'
import epdOralModel1_2bGrafik from '../assets/oral/epd-oral-model-1-2b-grafik.jpg'
import epdOralMedien1Grafik from '../assets/oral/epd-oral-medien-1-grafik.jpg'
import epdOralMedien1Karikatur from '../assets/oral/epd-oral-medien-1-karikatur.jpg'
import epdOralUmwelt1Grafik from '../assets/oral/epd-oral-umwelt-1-grafik.jpg'
import epdOralUmwelt1Karikatur from '../assets/oral/epd-oral-umwelt-1-karikatur.jpg'
import epdOralWohnen1Grafik from '../assets/oral/epd-oral-wohnen-1-grafik.jpg'
import epdOralWohnen1Karikatur from '../assets/oral/epd-oral-wohnen-1-karikatur.jpg'
import epdOralWohnen1Teil2Karikatur from '../assets/oral/epd-oral-wohnen-1-teil2-karikatur.jpg'
import epdOralLernen1Grafik from '../assets/oral/epd-oral-lernen-1-grafik.jpg'
import epdOralLernen1Bildimpuls from '../assets/oral/epd-oral-lernen-1-bildimpuls.jpg'
import epdOralLernen1Karikatur from '../assets/oral/epd-oral-lernen-1-karikatur.jpg'
import epdOralGesundheit1Grafik from '../assets/oral/epd-oral-gesundheit-1-grafik.jpg'
import epdOralGesundheit1Karikatur from '../assets/oral/epd-oral-gesundheit-1-karikatur.jpg'
import epdOralGesundheit1Bildimpuls from '../assets/oral/epd-oral-gesundheit-1-bildimpuls.jpg'
import epdOralKonsum1Grafik from '../assets/oral/epd-oral-konsum-1-grafik.jpg'
import epdOralKonsum1Karikatur from '../assets/oral/epd-oral-konsum-1-karikatur.jpg'
import epdOralKonsum1Bildimpuls from '../assets/oral/epd-oral-konsum-1-bildimpuls.jpg'
import epdOralEngagement1Grafik from '../assets/oral/epd-oral-engagement-1-grafik.jpg'
import epdOralEngagement1Karikatur from '../assets/oral/epd-oral-engagement-1-karikatur.jpg'
import epdOralEngagement1Bildimpuls from '../assets/oral/epd-oral-engagement-1-bildimpuls.jpg'
import epdOralGeschlechtergerechtigkeit1Bildimpuls from '../assets/oral/epd-oral-geschlechtergerechtigkeit-1-bildimpuls.jpg'
import epdOralGeschlechtergerechtigkeit1Karikatur from '../assets/oral/epd-oral-geschlechtergerechtigkeit-1-karikatur.jpg'
import epdOralGeschlechtergerechtigkeit1Grafik from '../assets/oral/epd-oral-geschlechtergerechtigkeit-1-grafik.jpg'
import epdOralArbeitswelt1Grafik from '../assets/oral/epd-oral-arbeitswelt-1-grafik.jpg'
import epdOralArbeitswelt1Karikatur from '../assets/oral/epd-oral-arbeitswelt-1-karikatur.jpg'
import epdOralArbeitswelt1Bildimpuls from '../assets/oral/epd-oral-arbeitswelt-1-bildimpuls.jpg'
import epeSample1WritingBlog from '../assets/questions/epe-sample-1-writing-blog.jpg'
import epeSellallBlogComment from '../assets/questions/epe-sellall-blog-comment.jpg'
import epeFarmingBlogPost from '../assets/questions/epe-farming-blog-post.jpg'
import epeCookeryBlogPost from '../assets/questions/epe-cookery-blog-post.jpg'
import epeCsaFarmBlogPost from '../assets/questions/epe-csa-farm-blog-post.jpg'
import epeEngineersBlogPost from '../assets/questions/epe-engineers-blog-post.jpg'
import epeExtremeSportsBlogPost from '../assets/questions/epe-extreme-sports-blog-post.jpg'
import epeFakenewsBlogPost from '../assets/questions/epe-fakenews-blog-post.jpg'
import epeGenderMarketingBlogPost from '../assets/questions/epe-gender-marketing-blog-post.jpg'
import epeGlobalVsLocalBlogPost from '../assets/questions/epe-global-vs-local-blog-post.jpg'
import epeMySchoolLifeBlogPost from '../assets/questions/epe-my-school-life-blog-post.jpg'
import epeStartupBlogPost from '../assets/questions/epe-startup-blog-post.jpg'
import epeRadioBlogPost from '../assets/questions/epe-radio-blog-post.jpg'
import epePartyAtWorkBlogPost from '../assets/questions/epe-party-at-work-blog-post.jpg'
import epeSleepPayBlogPost from '../assets/questions/epe-sleep-pay-blog-post.jpg'
import epePetsSchoolBlogPost from '../assets/questions/epe-pets-school-blog-post.jpg'
import epeOralSample1 from '../assets/oral/epe-oral-sample-1.jpg'
import epeOralSample2 from '../assets/oral/epe-oral-sample-2.jpg'
import epdFortschrittGrafik from '../assets/questions/epd-fortschritt-grafikinterpretation.jpg'
import epdFortschrittZitat from '../assets/questions/epd-fortschritt-stellungnahme-zitat.jpg'
import epdAusgabenGrafik from '../assets/questions/epd-ausgaben-oesterreicher-grafik.jpg'
import epdArbeitsweltZukunftZitat from '../assets/questions/epd-arbeitswelt-zukunft-zitat.jpg'
import epdPraesenzDistanzZitat from '../assets/questions/epd-praesenz-distanz-zitat.jpg'
import epdWohnenStudentischGrafik from '../assets/questions/epd-wohnen-studentisch-grafik.jpg'
import epdFlugverbotZugverkehrKurztext from '../assets/questions/epd-flugverbot-zugverkehr-kurztext.jpg'
import epdVerkehrUebermorgenKurztext from '../assets/questions/epd-verkehr-uebermorgen-kurztext.jpg'
import epdVegetarierMitleidKurztext from '../assets/questions/epd-vegetarier-mitleid-kurztext.jpg'
import epdGesundheitOesterreichGrafik from '../assets/questions/epd-gesundheit-oesterreich-grafik.jpg'
import epdVorsaetze2023Grafik from '../assets/questions/epd-vorsaetze-2023-grafik.jpg'
import epdWerNichtLerntKurztext from '../assets/questions/epd-wer-nicht-lernt-kurztext.jpg'
import epdStadtLandMobilitaetGrafik from '../assets/questions/epd-stadt-land-mobilitaet-grafik.jpg'

// Real photos (crops from the person's uploaded exam scans), imported as
// static assets like exam-hero images — not stored as giant base64 blobs
// in the database.
const REAL_PHOTOS = {
  'epm-abschluss-2-q5': epmAbschluss2Q5,
  'epm-abschluss-10-q1': epmAbschluss10Q1,
  'epm-abschluss-10-q2': epmAbschluss10Q2,
  'epm-abschluss-10-q5': epmAbschluss10Q5,
  'epm-abschluss-11-q1': epmAbschluss11Q1,
  'epm-abschluss-11-q2': epmAbschluss11Q2,
  'epm-abschluss-11-q5': epmAbschluss11Q5,
  'epm-abschluss-2-q7': epmAbschluss2Q7,
  'epd-musterpruefung-1-schreiben2': epdSchreiben2,
  'epd-musterpruefung-1-struktur-a1-beispiel': epdStruktur1Beispiel,
  'epd-musterpruefung-1-struktur-a2-beispiel': epdStruktur2Beispiel,
  'epd-oral-model-1-grafik': epdOralModel1Grafik,
  'epd-oral-model-1-karikatur': epdOralModel1Karikatur,
  'epd-oral-model-1-bildimpuls': epdOralModel1Bildimpuls,
  'epd-oral-model-1-2b-grafik': epdOralModel1_2bGrafik,
  'epd-oral-medien-1-grafik': epdOralMedien1Grafik,
  'epd-oral-medien-1-karikatur': epdOralMedien1Karikatur,
  'epd-oral-umwelt-1-grafik': epdOralUmwelt1Grafik,
  'epd-oral-umwelt-1-karikatur': epdOralUmwelt1Karikatur,
  'epd-oral-wohnen-1-grafik': epdOralWohnen1Grafik,
  'epd-oral-wohnen-1-karikatur': epdOralWohnen1Karikatur,
  'epd-oral-wohnen-1-teil2-karikatur': epdOralWohnen1Teil2Karikatur,
  'epd-oral-lernen-1-grafik': epdOralLernen1Grafik,
  'epd-oral-lernen-1-bildimpuls': epdOralLernen1Bildimpuls,
  'epd-oral-lernen-1-karikatur': epdOralLernen1Karikatur,
  'epd-oral-gesundheit-1-grafik': epdOralGesundheit1Grafik,
  'epd-oral-gesundheit-1-karikatur': epdOralGesundheit1Karikatur,
  'epd-oral-gesundheit-1-bildimpuls': epdOralGesundheit1Bildimpuls,
  'epd-oral-konsum-1-grafik': epdOralKonsum1Grafik,
  'epd-oral-konsum-1-karikatur': epdOralKonsum1Karikatur,
  'epd-oral-konsum-1-bildimpuls': epdOralKonsum1Bildimpuls,
  'epd-oral-engagement-1-grafik': epdOralEngagement1Grafik,
  'epd-oral-engagement-1-karikatur': epdOralEngagement1Karikatur,
  'epd-oral-engagement-1-bildimpuls': epdOralEngagement1Bildimpuls,
  'epd-oral-geschlechtergerechtigkeit-1-bildimpuls': epdOralGeschlechtergerechtigkeit1Bildimpuls,
  'epd-oral-geschlechtergerechtigkeit-1-karikatur': epdOralGeschlechtergerechtigkeit1Karikatur,
  'epd-oral-geschlechtergerechtigkeit-1-grafik': epdOralGeschlechtergerechtigkeit1Grafik,
  'epd-oral-arbeitswelt-1-grafik': epdOralArbeitswelt1Grafik,
  'epd-oral-arbeitswelt-1-karikatur': epdOralArbeitswelt1Karikatur,
  'epd-oral-arbeitswelt-1-bildimpuls': epdOralArbeitswelt1Bildimpuls,
  'epe-sample-1-writing-blog': epeSample1WritingBlog,
  'epe-sellall-blog-comment': epeSellallBlogComment,
  'epe-farming-blog-post': epeFarmingBlogPost,
  'epe-cookery-blog-post': epeCookeryBlogPost,
  'epe-csa-farm-blog-post': epeCsaFarmBlogPost,
  'epe-engineers-blog-post': epeEngineersBlogPost,
  'epe-extreme-sports-blog-post': epeExtremeSportsBlogPost,
  'epe-fakenews-blog-post': epeFakenewsBlogPost,
  'epe-gender-marketing-blog-post': epeGenderMarketingBlogPost,
  'epe-global-vs-local-blog-post': epeGlobalVsLocalBlogPost,
  'epe-my-school-life-blog-post': epeMySchoolLifeBlogPost,
  'epe-startup-blog-post': epeStartupBlogPost,
  'epe-radio-blog-post': epeRadioBlogPost,
  'epe-party-at-work-blog-post': epePartyAtWorkBlogPost,
  'epe-sleep-pay-blog-post': epeSleepPayBlogPost,
  'epe-pets-school-blog-post': epePetsSchoolBlogPost,
  'epe-oral-sample-1': epeOralSample1,
  'epe-oral-sample-2': epeOralSample2,
  'epd-fortschritt-grafikinterpretation': epdFortschrittGrafik,
  'epd-fortschritt-stellungnahme-zitat': epdFortschrittZitat,
  'epd-ausgaben-oesterreicher-grafik': epdAusgabenGrafik,
  'epd-arbeitswelt-zukunft-zitat': epdArbeitsweltZukunftZitat,
  'epd-praesenz-distanz-zitat': epdPraesenzDistanzZitat,
  'epd-wohnen-studentisch-grafik': epdWohnenStudentischGrafik,
  'epd-flugverbot-zugverkehr-kurztext': epdFlugverbotZugverkehrKurztext,
  'epd-verkehr-uebermorgen-kurztext': epdVerkehrUebermorgenKurztext,
  'epd-vegetarier-mitleid-kurztext': epdVegetarierMitleidKurztext,
  'epd-gesundheit-oesterreich-grafik': epdGesundheitOesterreichGrafik,
  'epd-vorsaetze-2023-grafik': epdVorsaetze2023Grafik,
  'epd-wer-nicht-lernt-kurztext': epdWerNichtLerntKurztext,
  'epd-stadt-land-mobilitaet-grafik': epdStadtLandMobilitaetGrafik,
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
