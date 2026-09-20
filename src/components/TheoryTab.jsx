import { useState } from 'react'
import { AboutContent } from './AboutSection.jsx'
import GrammatikRulesArticle from './GrammatikRulesArticle.jsx'
import { IconChevronRight } from './Icons.jsx'

// "Теория" tab (exam.theory in examData.js) — deliberately NOT the same
// accordion pattern as "Об экзамене" (AboutSection.jsx). This is meant
// to read like a small table of contents: pick a memo, it opens as its
// own clean article view (back link + title + content), not expand
// in place. `theory.sub` is a list of top-level headings (Письменная
// часть / Устная часть); each of those has its own `.sub` — the actual
// clickable articles — and optionally its own `.content` shown inline
// above the links (a short intro, not required).
export default function TheoryTab({ theory, exam }) {
  const [article, setArticle] = useState(null) // { h, content } | null

  if (article) {
    return (
      <div className="theory-article">
        <button type="button" className="theory-back" onClick={() => setArticle(null)}>
          ← Назад к теории
        </button>
        <h2 className="theory-article-title">{article.h}</h2>
        {article.downloadUrl && (
          <a className="theory-download-link" href={article.downloadUrl} target="_blank" rel="noreferrer">
            Скачать материалы
          </a>
        )}

        {/* rules — the rich card+sidebar layout (GrammatikRulesArticle.jsx)
            needs its own full-bleed two-column space, so it's rendered
            outside the width-capped .about-text prose column below. */}
        {article.rules && <GrammatikRulesArticle article={article} exam={exam} />}

        {article.content && (
          <div className="about-text theory-article-body">
            <AboutContent content={article.content} exam={exam} />
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="theory-index">
      {theory.sub.map((section) => (
        <div className="theory-section" key={section.h}>
          <h3 className="theory-section-title">{section.h}</h3>
          {section.content && (
            <div className="about-text theory-section-intro">
              <AboutContent content={section.content} exam={exam} />
            </div>
          )}
          {section.sub?.length > 0 && (
            <ul className="theory-links">
              {section.sub.map((item) =>
                // items with only a link and no article body (no content/rules)
                // are just a plain link — no point opening the article view
                // just to show a single "Скачать материалы" link again.
                item.downloadUrl && !item.content && !item.rules ? (
                  <li key={item.h}>
                    <a
                      className={`theory-link ${exam.className}`}
                      href={item.downloadUrl}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <span>{item.h}</span>
                      <IconChevronRight size={15} />
                    </a>
                  </li>
                ) : (
                  <li key={item.h}>
                    <button type="button" className={`theory-link ${exam.className}`} onClick={() => setArticle(item)}>
                      <span>{item.h}</span>
                      <IconChevronRight size={15} />
                    </button>
                  </li>
                )
              )}
            </ul>
          )}
        </div>
      ))}
    </div>
  )
}
