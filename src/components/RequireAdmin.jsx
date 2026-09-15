import { Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext.jsx'
import PageLoader from './PageLoader.jsx'

// Wraps every /admin/* route. Not just a UI nicety — the real
// enforcement is the RLS policies in supabase/schema.sql ("tests:
// admin write" / "questions: admin write"), which reject writes from
// anyone whose profiles.role isn't 'admin' no matter what the frontend
// does. This guard's job is just to keep non-admins from ever seeing
// the admin UI in the first place, and to redirect them somewhere
// sensible instead of showing a form that would fail to save anyway.
export default function RequireAdmin({ children }) {
  const { user, loading, isAdmin, profileLoading } = useAuth()

  if (loading || (user && profileLoading)) {
    return <PageLoader />
  }

  if (!user || !isAdmin) {
    return <Navigate to="/" replace />
  }

  return children
}
