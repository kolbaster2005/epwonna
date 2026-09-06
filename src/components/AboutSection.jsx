import { useState } from 'react'
import { IconClock, IconGroup, IconInfo, IconChevronRight } from './Icons.jsx'

// Renders exam.about (see examData.js) — richer than a flat heading+
// paragraph: each section has typed content blocks and can have its own
// nested subsections, to any depth (e.g. "Как проходит экзамен" →
// "Письменная часть" → "Чтение" / "Аудирование" / ...). Content block
// types:
//   { type: 'p', text }                     — a paragraph
//   { type: 'list', items, ordered? }       — <ul> or <ol>; each item is
//                                              either a plain string, or
//                                              { lead, text, url? } to
//                                              bold the leading label
//                                              ("Формат:") — and, if `url`
//                                              is set, make that label a
//                                              real link instead
//   { type: 'heading', text }               — an <h4> — for splitting one
//                                              long article/memo into
//                                              named parts without
//                                              creating a whole separate
//                                              nested subsection for it
//   { type: 'note', text }                  — a highlighted "Важно" box,
//                                              tinted in the exam's color
//                                              — put it inside whichever
//                                              subsection it's actually
//                                              about (e.g. inside
//                                              "Письменная часть"), not
//                                              on the parent section, so
//                                              it ends up on that card
//                                              rather than floating above it
//   { type: 'table', headers, rows }        — headers: string[]; each row
//                                              is an array of cells, one
//                                              per header; a cell is either
//                                              a string or string[] (several
//                                              example lines stacked in one
//                                              cell). Inside any cell text,
//                                              __word__ renders underlined.
//
// First-level subsections (depth 2, e.g. "Письменная часть"/"Устная
// часть") render as collapsed-by-default white accordion cards — click
// to reveal. Anything nested inside them (depth 3+) gets a colored
// background instead, so it visually reads as "grouped inside the white
// card" rather than another plain white block.
//
// A subsection whose `h` starts with "N. " (e.g. "1. Подготовка и
// монолог") renders as an elevated numbered step card instead — this
// check runs before the depth-based rules above, so it applies no
// matter how deep it is nested.

const META_ICONS = { clock: IconClock, group: IconGroup }
const STEP_HEADING = /^(\d+)\.\s*(.+)$/
const HEADING_BY_DEPTH = { 3: 'h5', 4: 'h6' } // depth 2 has its own heading inside the accordion button

function ListItem({ item }) {
  if (typeof item === 'string') return <li>{item}</li>
  const text = item.text.replace(/^\s+/, '')
  const needsSpace = text && !/^[.,;:!?)]/.test(text)
  return (
    <li>
      {item.url ? (
        <a className="about-link" href={item.url} target="_blank" rel="noopener noreferrer">
          {item.lead}
        </a>
      ) : (
        <strong>{item.lead}</strong>
      )}
      {needsSpace ? ' ' : ''}
      {text}
    </li>
  )
}

// Внутри ячеек таблицы __слово__ рендерится как подчёркнутое — простая
// разметка для памяток вида "Durch регулярного обучения..." (подчёркнут
// именно предлог), без необходимости городить отдельный тип узла ради
// этого одного случая форматирования.
function renderCellText(text) {
  const parts = text.split(/(__.+?__)/g)
  return parts.map((part, i) => {
    if (part.startsWith('__') && part.endsWith('__')) {
      return <u key={i}>{part.slice(2, -2)}</u>
    }
    return part
  })
}

// Ячейка — строка (одна строка текста) или массив строк (несколько
// строк-примеров внутри одной ячейки, как в памятках по грамматике).
function TableCell({ value }) {
  const lines = Array.isArray(value) ? value : [value]
  return (
    <td>
      {lines.map((line, i) => (
        <p key={i}>{renderCellText(line)}</p>
      ))}
    </td>
  )
}

export function AboutContent({ content, exam }) {
  return content.map((block, i) => {
    if (block.type === 'list') {
      const Tag = block.ordered ? 'ol' : 'ul'
      return (
        <Tag key={i}>
          {block.items.map((item, j) => (
            <ListItem item={item} key={j} />
          ))}
        </Tag>
      )
    }
    if (block.type === 'heading') {
      return <h4 key={i}>{block.text}</h4>
    }
    if (block.type === 'subheading') {
      return <h5 key={i}>{block.text}</h5>
    }
    if (block.type === 'note') {
      return (
        <div className={`about-note ${exam.className}`} key={i}>
          <IconInfo size={17} className="about-note-icon" />
          <span>{block.text}</span>
        </div>
      )
    }
    if (block.type === 'table') {
      return (
        <div className="about-table-scroll" key={i}>
          <table className="about-table">
            <thead>
              <tr>
                {block.headers.map((h, j) => (
                  <th key={j}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {block.rows.map((row, j) => (
                <tr key={j}>
                  {row.map((cell, k) => (
                    <TableCell value={cell} key={k} />
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )
    }
    return <p key={i}>{block.text}</p>
  })
}

function StepCard({ number, title, section, exam }) {
  const MetaIcon = section.meta && META_ICONS[section.meta.icon]
  return (
    <div className="about-step">
      <span className={`about-step-number ${exam.className}`}>{number}</span>
      <div className="about-step-body">
        <h5>{title}</h5>
        {section.content && <AboutContent content={section.content} exam={exam} />}
      </div>
      {MetaIcon && (
        <span className={`about-step-meta ${exam.className}`}>
          <MetaIcon size={15} />
          {section.meta.label && <span>{section.meta.label}</span>}
        </span>
      )}
    </div>
  )
}

// Collapsed by default — click the header to reveal. Only ever used for
// depth-2 subsections (see Subsection below); its children are always
// depth 3, since depth 2 is exactly one level under the top section.
function AccordionCard({ section, exam }) {
  const [open, setOpen] = useState(false)
  return (
    <div className={`about-accordion ${exam.className}` + (open ? ' open' : '')}>
      <button type="button" className="about-accordion-header" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        <h4 className="about-accordion-title">{section.h}</h4>
        <IconChevronRight size={14} className={'about-accordion-chev' + (open ? ' open' : '')} />
      </button>
      {open && (
        <div className="about-accordion-body">
          {section.content && <AboutContent content={section.content} exam={exam} />}
          {section.sub?.map((s, i) => (
            <Subsection section={s} depth={3} exam={exam} key={i} />
          ))}
        </div>
      )}
    </div>
  )
}

function Subsection({ section, depth, exam }) {
  const stepMatch = section.h.match(STEP_HEADING)
  if (stepMatch) {
    const [, number, title] = stepMatch
    return (
      <>
        <StepCard number={number} title={title} section={section} exam={exam} />
        {section.sub?.map((s, i) => (
          <Subsection section={s} depth={depth + 1} exam={exam} key={i} />
        ))}
      </>
    )
  }

  if (depth === 2) {
    return <AccordionCard section={section} exam={exam} />
  }

  const HeadingTag = HEADING_BY_DEPTH[depth] || 'h6'
  return (
    <div className={`about-subsection-deep ${exam.className}`}>
      <HeadingTag>{section.h}</HeadingTag>
      {section.content && <AboutContent content={section.content} exam={exam} />}
      {section.sub?.map((s, i) => (
        <Subsection section={s} depth={depth + 1} exam={exam} key={i} />
      ))}
    </div>
  )
}

export default function AboutSection({ section, exam }) {
  return (
    <div className="about-section">
      <h3 className="about-section-heading">{section.h}</h3>
      {section.content && <AboutContent content={section.content} exam={exam} />}
      {section.sub?.map((s, i) => (
        <Subsection section={s} depth={2} exam={exam} key={i} />
      ))}
    </div>
  )
}
