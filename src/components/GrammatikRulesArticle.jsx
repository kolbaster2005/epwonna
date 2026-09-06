import { useEffect, useRef, useState } from 'react'
import { IconLightbulb, IconStar } from './Icons.jsx'

// Renders a `rules`-based theory article (see examData.js — currently
// just the EPD "Памятка для части Grammatik") as a row of numbered rule
// cards on the left and a sticky "Содержание" table of contents on the
// right that tracks which rule is currently in view. This is a
// deliberately different, richer layout than the generic
// p/list/table content-block system in AboutSection.jsx — built once
// this specific format was requested, not meant to replace the generic
// system for simpler articles.
function RuleCard({ rule, id, registerRef }) {
  return (
    <div className="grammatik-rule" id={id} ref={(el) => registerRef(id, el)}>
      <div className="grammatik-rule-head">
        <span className="grammatik-rule-number">{rule.number}</span>
        <div>
          <h3 className="grammatik-rule-title">{rule.title}</h3>
          {rule.description && <p className="grammatik-rule-desc">{rule.description}</p>}
        </div>
      </div>

      <div className="grammatik-rule-pair">
        <div className="grammatik-box grammatik-box-beispiel">
          <span className="grammatik-pill grammatik-pill-beispiel">BEISPIEL</span>
          <p className="grammatik-sentence">{rule.example.text}</p>
          <p className="grammatik-translation">{rule.example.translation}</p>
        </div>
        <div className="grammatik-arrow" aria-hidden="true">→</div>
        <div className="grammatik-box grammatik-box-umformung">
          <span className="grammatik-pill grammatik-pill-umformung">UMFORMUNG</span>
          <p className="grammatik-sentence">{rule.transformation.text}</p>
          <p className="grammatik-translation">{rule.transformation.translation}</p>
        </div>
      </div>

      <div className="grammatik-rule-pair grammatik-rule-pair-bottom">
        <div className="grammatik-box grammatik-box-merke">
          <span className="grammatik-pill grammatik-pill-merke">
            <IconLightbulb size={13} /> MERKE
          </span>
          <ul>
            {rule.merke.map((m, i) => (
              <li key={i}>{m}</li>
            ))}
          </ul>
          {rule.important && <div className="grammatik-important">{rule.important}</div>}
        </div>
        {rule.changes?.length > 0 && (
          <div className="grammatik-box grammatik-box-changes">
            <span className="grammatik-pill grammatik-pill-changes">ИЗМЕНЕНИЯ</span>
            <div className="grammatik-changes-list">
              {rule.changes.map(([from, to], i) => (
                <div className="grammatik-change-item" key={i}>
                  <span>{from}</span>
                  <span aria-hidden="true">→</span>
                  <span className="grammatik-change-to">{to}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default function GrammatikRulesArticle({ article }) {
  const [activeId, setActiveId] = useState(article.rules[0]?.number)
  const refsById = useRef({})

  function registerRef(id, el) {
    if (el) refsById.current[id] = el
  }

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        // Pick the entry closest to the top of the viewport among those
        // currently intersecting, so the sidebar tracks whichever rule
        // the person is actually reading, not just "any visible one".
        const visible = entries.filter((e) => e.isIntersecting)
        if (visible.length > 0) {
          visible.sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)
          setActiveId(visible[0].target.id)
        }
      },
      { rootMargin: '-15% 0px -70% 0px', threshold: 0 }
    )
    Object.values(refsById.current).forEach((el) => observer.observe(el))
    return () => observer.disconnect()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function scrollToRule(id) {
    refsById.current[id]?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <div className="grammatik-layout">
      <div className="grammatik-main">
        {article.intro && <p className="grammatik-intro">{article.intro}</p>}
        {article.rules.map((rule) => (
          <RuleCard rule={rule} id={rule.number} key={rule.number} registerRef={registerRef} />
        ))}
      </div>

      <aside className="grammatik-toc">
        <div className="grammatik-toc-sticky">
          <h4>Содержание</h4>
          <ul>
            {article.rules.map((rule) => (
              <li key={rule.number}>
                <button
                  type="button"
                  className={'grammatik-toc-item' + (activeId === rule.number ? ' active' : '')}
                  onClick={() => scrollToRule(rule.number)}
                >
                  <span className="grammatik-toc-num">{rule.number}</span>
                  <span>{rule.title.split(' → ')[0]}</span>
                </button>
              </li>
            ))}
          </ul>
          <div className="grammatik-tip">
            <IconStar size={14} filled />
            <div>
              <b>Совет</b>
              <p>Сначала изучите правила и примеры, затем переходите к пробникам!</p>
            </div>
          </div>
        </div>
      </aside>
    </div>
  )
}
