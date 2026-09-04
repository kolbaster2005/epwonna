import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext.jsx'
import { recordPageView } from '../lib/visits.js'

// Records one row per page visited — own database, no third party (see
// visits.js + supabase/page_views.sql). Separate from ScrollToTop so
// each component keeps a single, obvious job.
export default function VisitTracker() {
  const { pathname } = useLocation()
  const { user } = useAuth()

  useEffect(() => {
    recordPageView(pathname, user?.id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname])

  return null
}
