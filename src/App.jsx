import { Routes, Route } from 'react-router-dom'
import Header from './components/Header.jsx'
import MobileNav from './components/MobileNav.jsx'
import Footer from './components/Footer.jsx'
import Home from './pages/Home.jsx'
import ExamPage from './pages/ExamPage.jsx'
import TestDetailPage from './pages/TestDetailPage.jsx'
import TestPage from './pages/TestPage.jsx'
import OralTestPage from './pages/OralTestPage.jsx'
import About from './pages/About.jsx'
import UniversityPage from './pages/UniversityPage.jsx'
import MyLearning from './pages/MyLearning.jsx'
import MyEssays from './pages/MyEssays.jsx'
import AttemptReview from './pages/AttemptReview.jsx'
import Dictionary from './pages/Dictionary.jsx'
import ComingSoonSubject from './components/ComingSoonSubject.jsx'
import ResetPasswordPage from './pages/ResetPasswordPage.jsx'
import TermsOfUse from './pages/TermsOfUse.jsx'
import { comingSoonSubjects } from './data/examData.js'
import NotFound from './pages/NotFound.jsx'
import AdminHome from './pages/admin/AdminHome.jsx'
import AdminReports from './pages/admin/AdminReports.jsx'
import AdminExamTests from './pages/admin/AdminExamTests.jsx'
import AdminTestEditor from './pages/admin/AdminTestEditor.jsx'
import AdminTopics from './pages/admin/AdminTopics.jsx'
import AdminExamParts from './pages/admin/AdminExamParts.jsx'
import AdminTaskBank from './pages/admin/AdminTaskBank.jsx'
import RequireAdmin from './components/RequireAdmin.jsx'
import SelectionPopup from './components/SelectionPopup.jsx'
import ScrollToTop from './components/ScrollToTop.jsx'
import { useEffect, useState } from 'react'

export default function App() {
  const [mobileNavOpen, setMobileNavOpen] = useState(false)

  // While the drawer covers the screen, the page behind it shouldn't
  // scroll at all — otherwise touch-scrolling the drawer can bleed
  // through to the page underneath, and closing the drawer drops you
  // somewhere other than where you opened it from.
  useEffect(() => {
    document.body.style.overflow = mobileNavOpen ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [mobileNavOpen])

  return (
    <>
      <ScrollToTop />
      <Header onBurgerClick={() => setMobileNavOpen(true)} />
      {mobileNavOpen && <MobileNav onClose={() => setMobileNavOpen(false)} />}

      <main className="main-wrapper">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/epm" element={<ExamPage key="epm" examKey="epm" />} />
          <Route path="/epm/about" element={<ExamPage key="epm" examKey="epm" initialTab="about" />} />
          <Route path="/epm/probnik/:testId" element={<TestDetailPage key="epm" examKey="epm" />} />
          <Route path="/epm/test/:testId" element={<TestPage key="epm" examKey="epm" />} />
          <Route path="/epd" element={<ExamPage key="epd" examKey="epd" />} />
          <Route path="/epd/about" element={<ExamPage key="epd" examKey="epd" initialTab="about" />} />
          <Route path="/epd/probnik/:testId" element={<TestDetailPage key="epd" examKey="epd" />} />
          <Route path="/epd/test/:testId" element={<TestPage key="epd" examKey="epd" />} />
          <Route path="/epd/oral/:testId" element={<OralTestPage key="epd" examKey="epd" />} />
          <Route path="/epe" element={<ExamPage key="epe" examKey="epe" />} />
          <Route path="/epe/about" element={<ExamPage key="epe" examKey="epe" initialTab="about" />} />
          <Route path="/epe/probnik/:testId" element={<TestDetailPage key="epe" examKey="epe" />} />
          <Route path="/epe/test/:testId" element={<TestPage key="epe" examKey="epe" />} />
          <Route path="/epe/oral/:testId" element={<OralTestPage key="epe" examKey="epe" />} />

          {/* Subjects with no real content yet — see comingSoonSubjects
              in examData.js. One route per subject key, all pointing at
              the same lightweight placeholder page. */}
          {comingSoonSubjects.map((s) => (
            <Route key={s.key} path={`/${s.key}`} element={<ComingSoonSubject subject={s} />} />
          ))}

          {/* "Вступительные в вузы" — group menu item, no page of its own,
              just links straight to these stub pages. */}
          <Route path="/uni/wu" element={<UniversityPage uniKey="wu" />} />
          <Route path="/uni/uniwien" element={<UniversityPage uniKey="uniwien" />} />
          <Route path="/uni/tuwien" element={<UniversityPage uniKey="tuwien" />} />

          <Route path="/my-learning" element={<MyLearning />} />
          <Route path="/my-learning/essays" element={<MyEssays />} />
          <Route path="/my-learning/attempt/:attemptId" element={<AttemptReview />} />
          <Route path="/dictionary" element={<Dictionary />} />
          <Route path="/about" element={<About />} />

          {/* Admin — real enforcement is at the DB level (RLS, see
              supabase/schema.sql); RequireAdmin here just keeps
              non-admins from seeing the panel at all. */}
          <Route path="/admin" element={<RequireAdmin><AdminHome /></RequireAdmin>} />
          <Route path="/admin/reports" element={<RequireAdmin><AdminReports /></RequireAdmin>} />
          <Route path="/admin/epm" element={<RequireAdmin><AdminExamTests key="epm" examKey="epm" /></RequireAdmin>} />
          <Route path="/admin/epm/topics" element={<RequireAdmin><AdminTopics key="epm-topics" examKey="epm" /></RequireAdmin>} />
          <Route path="/admin/epm/parts" element={<RequireAdmin><AdminExamParts key="epm-parts" examKey="epm" /></RequireAdmin>} />
          <Route path="/admin/epm/bank" element={<RequireAdmin><AdminTaskBank key="epm-bank" examKey="epm" /></RequireAdmin>} />
          <Route path="/admin/epm/new" element={<RequireAdmin><AdminTestEditor key="epm-new" examKey="epm" /></RequireAdmin>} />
          <Route path="/admin/epm/:testId" element={<RequireAdmin><AdminTestEditor key="epm" examKey="epm" /></RequireAdmin>} />
          <Route path="/admin/epd" element={<RequireAdmin><AdminExamTests key="epd" examKey="epd" /></RequireAdmin>} />
          <Route path="/admin/epd/topics" element={<RequireAdmin><AdminTopics key="epd-topics" examKey="epd" /></RequireAdmin>} />
          <Route path="/admin/epd/parts" element={<RequireAdmin><AdminExamParts key="epd-parts" examKey="epd" /></RequireAdmin>} />
          <Route path="/admin/epd/bank" element={<RequireAdmin><AdminTaskBank key="epd-bank" examKey="epd" /></RequireAdmin>} />
          <Route path="/admin/epd/new" element={<RequireAdmin><AdminTestEditor key="epd-new" examKey="epd" /></RequireAdmin>} />
          <Route path="/admin/epd/:testId" element={<RequireAdmin><AdminTestEditor key="epd" examKey="epd" /></RequireAdmin>} />
          <Route path="/admin/epe" element={<RequireAdmin><AdminExamTests key="epe" examKey="epe" /></RequireAdmin>} />
          <Route path="/admin/epe/topics" element={<RequireAdmin><AdminTopics key="epe-topics" examKey="epe" /></RequireAdmin>} />
          <Route path="/admin/epe/parts" element={<RequireAdmin><AdminExamParts key="epe-parts" examKey="epe" /></RequireAdmin>} />
          <Route path="/admin/epe/bank" element={<RequireAdmin><AdminTaskBank key="epe-bank" examKey="epe" /></RequireAdmin>} />
          <Route path="/admin/epe/new" element={<RequireAdmin><AdminTestEditor key="epe-new" examKey="epe" /></RequireAdmin>} />
          <Route path="/admin/epe/:testId" element={<RequireAdmin><AdminTestEditor key="epe" examKey="epe" /></RequireAdmin>} />

          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/terms" element={<TermsOfUse />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>

      <Footer />
      <SelectionPopup />
    </>
  )
}
