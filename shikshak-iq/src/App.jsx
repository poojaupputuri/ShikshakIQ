import { lazy, Suspense } from 'react';
import { Link, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from './context/AuthContext';
import NeuralBackground from './components/NeuralBackground';
import WebGLErrorBoundary from './components/WebGLErrorBoundary';
import Navigation from './components/Navigation';
import LoadingScreen from './components/LoadingScreen';
import { ToastProvider } from './context/ToastContext';
import { HiOutlineChevronRight } from 'react-icons/hi';

// Lazy-loaded page components (code-split at route level)
const Landing = lazy(() => import('./pages/Landing'));
const Login = lazy(() => import('./pages/Login'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Students = lazy(() => import('./pages/Students'));
const Quizzes = lazy(() => import('./pages/Quizzes'));
const Analytics = lazy(() => import('./pages/Analytics'));
const LearningGaps = lazy(() => import('./pages/LearningGaps'));
const Reports = lazy(() => import('./pages/Reports'));
const PaperAnalysis = lazy(() => import('./pages/PaperAnalysis'));
const PrincipalDashboard = lazy(() => import('./pages/admin/PrincipalDashboard'));
const Interventions = lazy(() => import('./pages/Interventions'));
const Notifications = lazy(() => import('./pages/Notifications'));
const TeacherPortal = lazy(() => import('./pages/TeacherPortal'));
const StudentPortal = lazy(() => import('./pages/StudentPortal'));
const ManageTeachers = lazy(() => import('./pages/admin/ManageTeachers'));
const ManageClasses = lazy(() => import('./pages/admin/ManageClasses'));
const ManageSubjects = lazy(() => import('./pages/admin/ManageSubjects'));
const ManageAssignments = lazy(() => import('./pages/admin/ManageAssignments'));
const AcademicYears = lazy(() => import('./pages/admin/AcademicYears'));

const breadcrumbLabels = {
  '/dashboard': 'Dashboard',
  '/students': 'Students',
  '/quizzes': 'Quizzes',
  '/analytics': 'Analytics',
  '/learning-gaps': 'Learning Gaps',
  '/reports': 'Reports',
  '/paper-analysis': 'Paper Analysis',
  '/interventions': 'Interventions',
  '/notifications': 'Notifications',
  '/admin': 'Admin Dashboard',
  '/admin/teachers': 'Teachers',
  '/admin/classes': 'Classes',
  '/admin/subjects': 'Subjects',
  '/admin/assignments': 'Assignments',
  '/admin/academic-years': 'Academic Years',
};

function Breadcrumbs() {
  const location = useLocation();
  const segments = location.pathname.split('/').filter(Boolean);

  if (segments.length === 0) return null;

  const crumbs = [];
  for (let i = 0; i < segments.length; i++) {
    const path = '/' + segments.slice(0, i + 1).join('/');
    const label = breadcrumbLabels[path] || segments[i].charAt(0).toUpperCase() + segments[i].slice(1).replace(/-/g, ' ');
    crumbs.push({ path, label, isLast: i === segments.length - 1 });
  }

  return (
    <nav className="px-6 pt-5 pb-2" aria-label="Breadcrumb">
      <ol className="flex items-center gap-1.5 text-xs">
        <li>
          <Link to={segments[0] === 'admin' ? '/admin' : '/dashboard'} className="text-gray-500 hover:text-purple-400 transition-colors">
            Home
          </Link>
        </li>
        {crumbs.map((crumb) => (
          <li key={crumb.path} className="flex items-center gap-1.5">
            <HiOutlineChevronRight size={12} className="text-gray-600" />
            {crumb.isLast ? (
              <span className="text-gray-300 font-medium">{crumb.label}</span>
            ) : (
              <Link to={crumb.path} className="text-gray-500 hover:text-purple-400 transition-colors">
                {crumb.label}
              </Link>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}

function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return <LoadingScreen message="Authenticating..." />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="flex min-h-screen w-full">
      <Navigation />
      <main className="relative z-10 flex-1 min-h-screen">
        <Breadcrumbs />
        {children}
      </main>
    </div>
  );
}

function PrincipalRoute({ children }) {
  const { isAuthenticated, loading, isPrincipal } = useAuth();

  if (loading) {
    return <LoadingScreen message="Authenticating..." />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (!isPrincipal) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="flex min-h-screen w-full">
      <Navigation />
      <main className="relative z-10 flex-1 min-h-screen">
        <Breadcrumbs />
        {children}
      </main>
    </div>
  );
}

function PublicRoute({ children }) {
  const { isAuthenticated } = useAuth();

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}

/** Suspense fallback shared by all lazy-loaded routes */
function RouteFallback() {
  return <LoadingScreen message="Loading page..." />;
}

const pageVariants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 },
};

function AnimatedPage({ children }) {
  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={{ duration: 0.3, ease: 'easeInOut' }}
    >
      <Suspense fallback={<RouteFallback />}>
        {children}
      </Suspense>
    </motion.div>
  );
}

export default function App() {
  const location = useLocation();

  return (
    <div className="relative min-h-screen bg-[#0a0a0f]">
      <WebGLErrorBoundary>
        <NeuralBackground />
      </WebGLErrorBoundary>

      <ToastProvider>
      <AnimatePresence mode="wait">
        <Routes location={location} key={location.pathname}>
          <Route
            path="/"
            element={
              <Suspense fallback={<RouteFallback />}>
                <Landing />
              </Suspense>
            }
          />
          <Route
            path="/login"
            element={
              <PublicRoute>
                <Suspense fallback={<RouteFallback />}>
                  <Login />
                </Suspense>
              </PublicRoute>
            }
          />

          {/* Teacher Routes */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <AnimatedPage><Dashboard /></AnimatedPage>
              </ProtectedRoute>
            }
          />
          <Route
            path="/students"
            element={
              <ProtectedRoute>
                <AnimatedPage><Students /></AnimatedPage>
              </ProtectedRoute>
            }
          />
          <Route
            path="/quizzes"
            element={
              <ProtectedRoute>
                <AnimatedPage><Quizzes /></AnimatedPage>
              </ProtectedRoute>
            }
          />
          <Route
            path="/analytics"
            element={
              <ProtectedRoute>
                <AnimatedPage><Analytics /></AnimatedPage>
              </ProtectedRoute>
            }
          />
          <Route
            path="/learning-gaps"
            element={
              <ProtectedRoute>
                <AnimatedPage><LearningGaps /></AnimatedPage>
              </ProtectedRoute>
            }
          />
          <Route
            path="/reports"
            element={
              <ProtectedRoute>
                <AnimatedPage><Reports /></AnimatedPage>
              </ProtectedRoute>
            }
          />
          <Route
            path="/paper-analysis"
            element={
              <ProtectedRoute>
                <AnimatedPage><PaperAnalysis /></AnimatedPage>
              </ProtectedRoute>
            }
          />
          <Route
            path="/interventions"
            element={
              <ProtectedRoute>
                <AnimatedPage><Interventions /></AnimatedPage>
              </ProtectedRoute>
            }
          />
          <Route
            path="/notifications"
            element={
              <ProtectedRoute>
                <AnimatedPage><Notifications /></AnimatedPage>
              </ProtectedRoute>
            }
          />

          {/* Principal/Admin Routes */}
          <Route
            path="/admin"
            element={
              <PrincipalRoute>
                <AnimatedPage><PrincipalDashboard /></AnimatedPage>
              </PrincipalRoute>
            }
          />
          <Route
            path="/admin/teachers"
            element={
              <PrincipalRoute>
                <AnimatedPage><ManageTeachers /></AnimatedPage>
              </PrincipalRoute>
            }
          />
          <Route
            path="/admin/classes"
            element={
              <PrincipalRoute>
                <AnimatedPage><ManageClasses /></AnimatedPage>
              </PrincipalRoute>
            }
          />
          <Route
            path="/admin/subjects"
            element={
              <PrincipalRoute>
                <AnimatedPage><ManageSubjects /></AnimatedPage>
              </PrincipalRoute>
            }
          />
          <Route
            path="/admin/assignments"
            element={
              <PrincipalRoute>
                <AnimatedPage><ManageAssignments /></AnimatedPage>
              </PrincipalRoute>
            }
          />
          {/* Portal Routes */}
          <Route
            path="/teacher-portal"
            element={
              <Suspense fallback={<RouteFallback />}>
                <TeacherPortal />
              </Suspense>
            }
          />
          <Route
            path="/student-portal"
            element={
              <Suspense fallback={<RouteFallback />}>
                <StudentPortal />
              </Suspense>
            }
          />
          <Route
            path="/admin/academic-years"
            element={
              <PrincipalRoute>
                <AnimatedPage><AcademicYears /></AnimatedPage>
              </PrincipalRoute>
            }
          />

          <Route
            path="*"
            element={
              <ProtectedRoute>
                <AnimatedPage>
                  <div className="flex items-center justify-center min-h-[60vh]">
                    <div className="text-center">
                      <h1 className="text-4xl font-bold text-white mb-2">404</h1>
                      <p className="text-gray-400">Page not found</p>
                    </div>
                  </div>
                </AnimatedPage>
              </ProtectedRoute>
            }
          />
        </Routes>
      </AnimatePresence>
      </ToastProvider>
    </div>
  );
}
