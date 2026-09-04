// Small inline icon set, stroke-based so color is controlled via the
// `color` prop (defaults to currentColor so it inherits from CSS).
// Kept in one file instead of scattering <svg> blocks across components.

function base(props) {
  return { width: props.size ?? 18, height: props.size ?? 18, viewBox: '0 0 24 24', fill: 'none', className: props.className }
}
function stroke(props) {
  return { stroke: props.color ?? 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round' }
}

export function IconList(props) {
  return (
    <svg {...base(props)}>
      <path d="M9 6h11M9 12h11M9 18h11" {...stroke(props)} />
      <path d="M4.5 6h.01M4.5 12h.01M4.5 18h.01" {...stroke(props)} strokeWidth={2.4} />
    </svg>
  )
}

export function IconClock(props) {
  return (
    <svg {...base(props)}>
      <circle cx="12" cy="12" r="8.5" {...stroke(props)} />
      <path d="M12 7.5V12l3 2" {...stroke(props)} />
    </svg>
  )
}

export function IconGroup(props) {
  return (
    <svg {...base(props)}>
      <circle cx="9" cy="8.5" r="3" {...stroke(props)} />
      <path d="M3.5 19c0-3 2.5-5 5.5-5s5.5 2 5.5 5" {...stroke(props)} />
      <circle cx="17" cy="9.5" r="2.4" {...stroke(props)} />
      <path d="M15.5 14.2c2.2 0.3 4 2 4 4.8" {...stroke(props)} />
    </svg>
  )
}

export function IconInfo(props) {
  return (
    <svg {...base(props)}>
      <circle cx="12" cy="12" r="8.5" {...stroke(props)} />
      <path d="M12 11v5.5" {...stroke(props)} />
      <circle cx="12" cy="8" r="0.9" fill={props.color || 'currentColor'} stroke="none" />
    </svg>
  )
}

export function IconNoAvatar(props) {
  return (
    <svg {...base(props)}>
      <circle cx="12" cy="12" r="8.5" {...stroke(props)} />
      <path d="M6.5 17.5l11-11" {...stroke(props)} />
    </svg>
  )
}

export function IconShield(props) {
  return (
    <svg {...base(props)}>
      <path d="M12 3.5 19 6.5v5.2c0 4.3-2.9 7.4-7 8.8-4.1-1.4-7-4.5-7-8.8V6.5L12 3.5Z" {...stroke(props)} />
      <path d="M9 12.2l2 2 4-4.4" {...stroke(props)} />
    </svg>
  )
}

export function IconCalendar(props) {
  return (
    <svg {...base(props)}>
      <rect x="4" y="5.5" width="16" height="15" rx="2.5" {...stroke(props)} />
      <path d="M4 10h16M8 3.5v3M16 3.5v3" {...stroke(props)} />
    </svg>
  )
}

export function IconSliders(props) {
  return (
    <svg {...base(props)}>
      <path d="M5 6h14M5 12h14M5 18h14" {...stroke(props)} />
      <circle cx="9" cy="6" r="2" fill="var(--bg-white, #fff)" {...stroke(props)} />
      <circle cx="16" cy="12" r="2" fill="var(--bg-white, #fff)" {...stroke(props)} />
      <circle cx="10" cy="18" r="2" fill="var(--bg-white, #fff)" {...stroke(props)} />
    </svg>
  )
}

export function IconTag(props) {
  return (
    <svg {...base(props)}>
      <path d="M11 4h5.5L20 7.5V13L12 21l-8-8L11 4Z" {...stroke(props)} />
      <path d="M14.5 9.5h.01" {...stroke(props)} strokeWidth={2.6} />
    </svg>
  )
}

export function IconSearch(props) {
  return (
    <svg {...base(props)}>
      <circle cx="10.5" cy="10.5" r="6.5" {...stroke(props)} />
      <path d="M19 19l-4-4" {...stroke(props)} />
    </svg>
  )
}

export function IconHome(props) {
  return (
    <svg {...base(props)}>
      <path d="M4 11.5 12 4l8 7.5" {...stroke(props)} />
      <path d="M6.5 10v8.5A1.5 1.5 0 0 0 8 20h8a1.5 1.5 0 0 0 1.5-1.5V10" {...stroke(props)} />
    </svg>
  )
}

export function IconChevronRight(props) {
  return (
    <svg {...base(props)}>
      <path d="M9 5l7 7-7 7" {...stroke(props)} />
    </svg>
  )
}

export function IconDownload(props) {
  return (
    <svg {...base(props)}>
      <path d="M12 4v11" {...stroke(props)} />
      <path d="M7.5 11.5 12 16l4.5-4.5" {...stroke(props)} />
      <path d="M5 19.5h14" {...stroke(props)} />
    </svg>
  )
}

export function IconImage(props) {
  return (
    <svg {...base(props)}>
      <rect x="3.5" y="4.5" width="17" height="15" rx="2.5" {...stroke(props)} />
      <circle cx="8.5" cy="9.5" r="1.6" {...stroke(props)} />
      <path d="M4 16.5l5-5 3.5 3.5L16 11l4.5 4.5" {...stroke(props)} />
    </svg>
  )
}

export function IconMic(props) {
  return (
    <svg {...base(props)}>
      <rect x="9" y="3.5" width="6" height="10.5" rx="3" {...stroke(props)} />
      <path d="M6 11.5a6 6 0 0 0 12 0" {...stroke(props)} />
      <path d="M12 17.5v3M9 20.5h6" {...stroke(props)} />
    </svg>
  )
}

export function IconBook(props) {
  return (
    <svg {...base(props)}>
      <path d="M4 5.5c0-1 .8-1.5 2-1.5h5.5v14.5H6c-1.2 0-2 .5-2 1.5v-14.5Z" {...stroke(props)} />
      <path d="M20 5.5c0-1-.8-1.5-2-1.5h-5.5v14.5H18c1.2 0 2 .5 2 1.5v-14.5Z" {...stroke(props)} />
    </svg>
  )
}

export function IconCheckCircle(props) {
  return (
    <svg {...base(props)}>
      <circle cx="12" cy="12" r="8.5" {...stroke(props)} />
      <path d="M8.5 12.3l2.3 2.3 4.7-5" {...stroke(props)} />
    </svg>
  )
}

export function IconGraduationCap(props) {
  return (
    <svg {...base(props)}>
      <path d="M12 4.5 21 9l-9 4.5L3 9l9-4.5Z" {...stroke(props)} />
      <path d="M7 11v4.5c0 1.4 2.2 2.5 5 2.5s5-1.1 5-2.5V11" {...stroke(props)} />
      <path d="M21 9v5" {...stroke(props)} />
    </svg>
  )
}

export function IconHeart(props) {
  return (
    <svg {...base(props)}>
      <path
        d="M12 20s-7.5-4.6-9.8-9.3C.7 7.2 2.4 4 5.7 4c2 0 3.4 1.1 4.3 2.4C10.9 5.1 12.3 4 14.3 4c3.3 0 5 3.2 3.5 6.7C15.5 15.4 12 20 12 20Z"
        {...stroke(props)}
      />
    </svg>
  )
}

export function IconTranslate(props) {
  return (
    <svg {...base(props)}>
      <path d="M4 5.5h9M8.5 3.5v2" {...stroke(props)} />
      <path d="M6.5 5.5c.4 3 2.2 5.3 5 6.8M11 5.5c-.7 3.4-2.8 6-6 7.8" {...stroke(props)} />
      <path d="M13.5 20.5 17 12l3.5 8.5M14.6 17.8h4.8" {...stroke(props)} />
    </svg>
  )
}

export function IconBookmarkPlus(props) {
  return (
    <svg {...base(props)}>
      <path d="M6 4h9c1.1 0 2 .9 2 2v14l-6.5-4L4 20V6c0-1.1.9-2 2-2Z" {...stroke(props)} />
      <path d="M8 9.5h4.5M10.25 7.25v4.5" {...stroke(props)} />
    </svg>
  )
}

export function IconHighlighter(props) {
  return (
    <svg {...base(props)}>
      <path d="M11 4.5 17.5 11 9 19.5 4 20.5 5 15.5Z" {...stroke(props)} />
      <path d="M14.5 7 17.5 10" {...stroke(props)} />
      <path d="M4 20.5 9 19.5" {...stroke(props)} />
    </svg>
  )
}

export function IconEdit(props) {
  return (
    <svg {...base(props)}>
      <path d="M15 4.5 19.5 9 8 20.5 3.5 21.5 4.5 17Z" {...stroke(props)} />
      <path d="M13 6.5 17.5 11" {...stroke(props)} />
    </svg>
  )
}

export function IconTrash(props) {
  return (
    <svg {...base(props)}>
      <path d="M4.5 6.5h15" {...stroke(props)} />
      <path d="M9 6.5V4.8c0-.7.6-1.3 1.3-1.3h3.4c.7 0 1.3.6 1.3 1.3v1.7" {...stroke(props)} />
      <path d="M6.5 6.5 7.3 20c.1 1 .9 1.7 1.9 1.7h5.6c1 0 1.8-.7 1.9-1.7l.8-13.5" {...stroke(props)} />
      <path d="M10 10.5v7M14 10.5v7" {...stroke(props)} />
    </svg>
  )
}

export function IconPlus(props) {
  return (
    <svg {...base(props)}>
      <path d="M12 5v14M5 12h14" {...stroke(props)} />
    </svg>
  )
}

export function IconTelegram(props) {
  return (
    <svg {...base(props)}>
      <path
        d="M21 4 3 11.2c-.9.4-.9 1.6.1 1.9l4.4 1.4 1.7 5.3c.3.9 1.4 1.1 2 .4l2.4-2.6 4.5 3.3c.8.6 2 .2 2.2-.8L23.5 5.3c.3-1-.7-1.8-1.6-1.3Z"
        {...stroke(props)}
      />
      <path d="M7.5 14.5 18 7l-8.6 8.3v3.9" {...stroke(props)} />
    </svg>
  )
}

export function IconPin(props) {
  return (
    <svg {...base(props)}>
      <path
        d="M14.5 3.5 20.5 9.5c.5.5.3 1.4-.4 1.6l-2.9.9-3.4 3.4.9 3.4c.2.7-.6 1.3-1.2.9l-3.6-2.6-4 4-1-1 4-4-2.6-3.6c-.4-.6.2-1.4.9-1.2l3.4.9 3.4-3.4.9-2.9c.2-.7 1.1-.9 1.6-.4Z"
        {...stroke(props)}
      />
    </svg>
  )
}

export function IconPinFilled(props) {
  return (
    <svg {...base(props)}>
      <path
        d="M14.5 3.5 20.5 9.5c.5.5.3 1.4-.4 1.6l-2.9.9-3.4 3.4.9 3.4c.2.7-.6 1.3-1.2.9l-3.6-2.6-4 4-1-1 4-4-2.6-3.6c-.4-.6.2-1.4.9-1.2l3.4.9 3.4-3.4.9-2.9c.2-.7 1.1-.9 1.6-.4Z"
        fill={props.color || 'currentColor'}
        stroke={props.color || 'currentColor'}
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  )
}
