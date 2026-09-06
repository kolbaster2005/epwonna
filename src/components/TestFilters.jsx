import { useEffect, useRef, useState } from 'react'
import { IconSliders, IconTag, IconCalendar, IconChevronRight } from './Icons.jsx'

// Picks an icon for a filter purely by its field name — doesn't need
// per-filter config in examData.js, so new filter fields "just work".
function iconFor(field) {
  if (field === 'topic') return IconTag
  if (field === 'year') return IconCalendar
  return IconSliders // isOfficial, format, and anything else generic
}

// A self-built dropdown (button + absolutely positioned option list)
// instead of a native <select>. A native select's open popup is drawn
// by the browser/OS, entirely outside our CSS's control — it can render
// wider than its own trigger and spill past the card that contains it
// (exactly the "выпирает" glitch this replaces). Since this list is
// real DOM, `left/right: 0` on it guarantees it's never wider than the
// button that opened it.
function FilterDropdown({ field, label, options, value, onChange }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  const Icon = iconFor(field)
  const selected = options.find((o) => o.value === value)

  useEffect(() => {
    if (!open) return undefined
    function handlePointerDown(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    function handleKeyDown(e) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [open])

  function choose(v) {
    onChange(v)
    setOpen(false)
  }

  return (
    <div className="filter-dropdown" ref={ref}>
      <button type="button" className="filter-dropdown-trigger" aria-haspopup="listbox" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        <Icon size={16} />
        <span>{selected ? selected.label : `Все — ${label.toLowerCase()}`}</span>
        <IconChevronRight size={12} className={'filter-chev' + (open ? ' open' : '')} />
      </button>

      {open && (
        <div className="filter-dropdown-list" role="listbox">
          <button type="button" className={'filter-dropdown-option' + (!value ? ' active' : '')} onClick={() => choose('')}>
            Все — {label.toLowerCase()}
          </button>
          {options.map((opt) => (
            <button
              key={opt.value}
              type="button"
              className={'filter-dropdown-option' + (value === opt.value ? ' active' : '')}
              onClick={() => choose(opt.value)}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default function TestFilters({ filters, values, onChange, onReset, leading }) {
  const activeCount = Object.values(values).filter(Boolean).length
  // Collapsed by default on mobile (see _filters.scss — the toggle button
  // itself is only shown below $bp-sm, and the body is always visible
  // from $bp-sm up regardless of this state).
  const [expanded, setExpanded] = useState(false)

  if (filters.length === 0 && !leading) return null

  return (
    <div className="test-filters">
      {leading && <div className="test-filters-leading">{leading}</div>}

      {filters.length > 0 && (
        <>
          <button type="button" className="test-filters-toggle" onClick={() => setExpanded((e) => !e)}>
            <IconSliders size={16} />
            <span>Фильтры{activeCount > 0 ? ` · ${activeCount}` : ''}</span>
            <IconChevronRight size={13} className={'filter-chev' + (expanded ? ' open' : '')} />
          </button>

          <div className={'test-filters-body' + (expanded ? ' open' : '')}>
            {filters.map((f) => (
              <FilterDropdown
                key={f.field}
                field={f.field}
                label={f.label}
                options={f.options}
                value={values[f.field] || ''}
                onChange={(v) => onChange(f.field, v)}
              />
            ))}

            {activeCount > 0 && (
              <button type="button" className="filter-reset" onClick={onReset}>
                Сбросить фильтры ✕
              </button>
            )}
          </div>
        </>
      )}
    </div>
  )
}
