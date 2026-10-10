import { Routes, Route } from 'react-router-dom'
import { lazy, Suspense, useEffect, useState } from 'react'
import ProLayout from './components/ProLayout.jsx'
import Home from './pages/Home.jsx'
import ComingSoonSubject from './components/ComingSoonSubject.jsx'
import { comingSoonSubjects } from './data/examData.js'
import RequireAdmin from './components/RequireAdmin.jsx'
import SelectionPopup from './components/SelectionPopup.jsx'
import ScrollToTop from './components/ScrollToTop.jsx'
import VisitTracker from './components/VisitTracker.jsx'
import PageLoader from './components/PageLoader.jsx'

// Всё, кроме главной (Home — самая частая первая загрузка, остаётся в
// основном чанке), грузится отдельными чанками по требованию —
// особенно важно для админки (9 страниц), которую видит только один
// человек, но раньше её JS утекал в общий бандл абсолютно всем гостям.
const ExamPage = lazy(() => import('./pages/ExamPage.jsx'))
const TestDetailPage = lazy(() => import('./pages/TestDetailPage.jsx'))
const TestPage = lazy(() => import('./pages/TestPage.jsx'))
const PracticeBuilder = lazy(() => import('./pages/PracticeBuilder.jsx'))
const OralTestPage = lazy(() => import('./pages/OralTestPage.jsx'))
const About = lazy(() => import('./pages/About.jsx'))
const Pricing = lazy(() => import('./pages/Pricing.jsx'))
const UniversityPage = lazy(() => import('./pages/UniversityPage.jsx'))
const MyLearning = lazy(() => import('./pages/MyLearning.jsx'))
const MyEssays = lazy(() => import('./pages/MyEssays.jsx'))
const Personalization = lazy(() => import('./pages/Personalization.jsx'))
const AttemptReview = lazy(() => import('./pages/AttemptReview.jsx'))
const Dictionary = lazy(() => import('./pages/Dictionary.jsx'))
const ResetPasswordPage = lazy(() => import('./pages/ResetPasswordPage.jsx'))
const TermsOfUse = lazy(() => import('./pages/TermsOfUse.jsx'))
const PrivacyPolicy = lazy(() => import('./pages/PrivacyPolicy.jsx'))
const NotFound = lazy(() => import('./pages/NotFound.jsx'))
const AdminHome = lazy(() => import('./pages/admin/AdminHome.jsx'))
const AdminUsers = lazy(() => import('./pages/admin/AdminUsers.jsx'))
const AdminReports = lazy(() => import('./pages/admin/AdminReports.jsx'))
const AdminStats = lazy(() => import('./pages/admin/AdminStats.jsx'))
const AdminExamTests = lazy(() => import('./pages/admin/AdminExamTests.jsx'))
const AdminTestEditor = lazy(() => import('./pages/admin/AdminTestEditor.jsx'))
const AdminTopics = lazy(() => import('./pages/admin/AdminTopics.jsx'))
const AdminExamParts = lazy(() => import('./pages/admin/AdminExamParts.jsx'))
const AdminTaskBank = lazy(() => import('./pages/admin/AdminTaskBank.jsx'))
const AdminExamCountdown = lazy(() => import('./pages/admin/AdminExamCountdown.jsx'))

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

  const routes = (
  <Suspense fallback={<PageLoader />}>
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
    <Route path="/epd/practice" element={<PracticeBuilder key="epd" examKey="epd" />} />
    <Route path="/epe" element={<ExamPage key="epe" examKey="epe" />} />
    <Route path="/epe/about" element={<ExamPage key="epe" examKey="epe" initialTab="about" />} />
    <Route path="/epe/probnik/:testId" element={<TestDetailPage key="epe" examKey="epe" />} />
    <Route path="/epe/test/:testId" element={<TestPage key="epe" examKey="epe" />} />
    <Route path="/epe/oral/:testId" element={<OralTestPage key="epe" examKey="epe" />} />
    <Route path="/epe/practice" element={<PracticeBuilder key="epe" examKey="epe" />} />
    <Route path="/chemie" element={<ExamPage key="chemie" examKey="chemie" initialTab="about" />} />
    <Route path="/chemie/about" element={<ExamPage key="chemie" examKey="chemie" initialTab="about" />} />
    <Route path="/chemie/probnik/:testId" element={<TestDetailPage key="chemie" examKey="chemie" />} />
    <Route path="/chemie/test/:testId" element={<TestPage key="chemie" examKey="chemie" />} />
    <Route path="/physik" element={<ExamPage key="physik" examKey="physik" initialTab="about" />} />
    <Route path="/physik/about" element={<ExamPage key="physik" examKey="physik" initialTab="about" />} />
    <Route path="/physik/probnik/:testId" element={<TestDetailPage key="physik" examKey="physik" />} />
    <Route path="/physik/test/:testId" element={<TestPage key="physik" examKey="physik" />} />

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
    <Route path="/personalization" element={<Personalization />} />
    <Route path="/pro" element={<Pricing />} />
    <Route path="/about" element={<About />} />

    {/* Admin — real enforcement is at the DB level (RLS, see
        supabase/schema.sql); RequireAdmin here just keeps
        non-admins from seeing the panel at all. */}
    <Route path="/admin" element={<RequireAdmin><AdminHome /></RequireAdmin>} />
    <Route path="/admin/users" element={<RequireAdmin><AdminUsers /></RequireAdmin>} />
    <Route path="/admin/reports" element={<RequireAdmin><AdminReports /></RequireAdmin>} />
    <Route path="/admin/stats" element={<RequireAdmin><AdminStats /></RequireAdmin>} />
    <Route path="/admin/exam-countdown" element={<RequireAdmin><AdminExamCountdown /></RequireAdmin>} />
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
    <Route path="/privacy" element={<PrivacyPolicy />} />
    <Route path="*" element={<NotFound />} />
  </Routes>
  </Suspense>
  )

  // Левое меню (ProLayout) вместо старой верхней шапки — теперь общая
  // раскладка для всех, не только для pro-аккаунтов (см. PRO_EMAILS в
  // AuthContext.jsx): различаются только главная страница (Home.jsx
  // сама решает, что показать — ProDashboard залогиненным, обычный
  // hero гостям) и состав самого меню (ProSidebar.jsx).
  return (
    <>
      <ScrollToTop />
      <VisitTracker />
      <ProLayout drawerOpen={mobileNavOpen} onDrawerOpen={() => setMobileNavOpen(true)} onDrawerClose={() => setMobileNavOpen(false)}>
        <main className="main-wrapper">{routes}</main>
      </ProLayout>
      <SelectionPopup />
    </>
  )
}
