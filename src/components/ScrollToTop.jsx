import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

// React Router doesn't reset scroll position on navigation the way a
// normal full-page load would — without this, clicking a link while
// scrolled down opens the new page still scrolled to that same spot,
// which is especially jarring on mobile. Runs on every pathname change
// (not on query-string-only changes, e.g. filters, so those don't
// yank the person back up while they're adjusting them).
export default function ScrollToTop() {
  const { pathname } = useLocation()

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])

  return null
}
