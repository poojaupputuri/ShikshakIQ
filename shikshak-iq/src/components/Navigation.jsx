import { useState, useRef, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import {
  HiOutlineHome,
  HiOutlineUsers,
  HiOutlineAcademicCap,
  HiOutlineChartBar,
  HiOutlineDocumentReport,
  HiOutlineLogout,
  HiOutlineGlobe,
  HiOutlineMenu,
  HiOutlineX,
  HiOutlineDocumentText,
  HiOutlineCog,
  HiOutlineBookOpen,
  HiOutlineSwitchHorizontal,
  HiOutlineClipboardList,
  HiOutlineViewGrid,
  HiOutlineSupport,
  HiOutlineBell,
  HiOutlineChevronDoubleLeft,
  HiOutlineChevronDoubleRight,
} from 'react-icons/hi';

const teacherNavItems = [
  { path: '/dashboard', labelKey: 'nav.dashboard', icon: HiOutlineHome },
  { path: '/students', labelKey: 'nav.students', icon: HiOutlineUsers },
  { path: '/quizzes', labelKey: 'nav.quizzes', icon: HiOutlineAcademicCap },
  { path: '/learning-gaps', labelKey: 'nav.learningGaps', icon: HiOutlineViewGrid },
  { path: '/interventions', labelKey: 'Interventions', icon: HiOutlineSupport },
  { path: '/notifications', labelKey: 'Notifications', icon: HiOutlineBell },
  { path: '/paper-analysis', labelKey: 'nav.paperAnalysis', icon: HiOutlineDocumentText },
  { path: '/analytics', labelKey: 'nav.analytics', icon: HiOutlineChartBar },
  { path: '/reports', labelKey: 'nav.reports', icon: HiOutlineDocumentReport },
];

const adminNavItems = [
  { path: '/admin', labelKey: 'nav.dashboard', icon: HiOutlineHome },
  { path: '/admin/teachers', labelKey: 'nav.teachers', icon: HiOutlineUsers },
  { path: '/admin/classes', labelKey: 'nav.classes', icon: HiOutlineBookOpen },
  { path: '/admin/subjects', labelKey: 'nav.subjects', icon: HiOutlineClipboardList },
  { path: '/admin/assignments', labelKey: 'nav.assignments', icon: HiOutlineSwitchHorizontal },
  { path: '/admin/academic-years', labelKey: 'nav.academicYears', icon: HiOutlineCog },
];

export default function Navigation() {
  const { t } = useTranslation();
  const { user, workspaces, activeWorkspace, switchWorkspace, logout, isPrincipal, isTeacher, isAuthenticated } = useAuth();
  const { currentLanguage, changeLanguage, languages } = useLanguage();
  const location = useLocation();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [showLanguage, setShowLanguage] = useState(false);
  const [showWorkspaceSelector, setShowWorkspaceSelector] = useState(false);
  const langRef = useRef(null);
  const wsRef = useRef(null);

  const isLoginPage = location.pathname === '/login';

  // Close mobile menu on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  // Close dropdowns on click outside
  useEffect(() => {
    function handleClickOutside(e) {
      if (langRef.current && !langRef.current.contains(e.target)) setShowLanguage(false);
      if (wsRef.current && !wsRef.current.contains(e.target)) setShowWorkspaceSelector(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (isLoginPage || !user || !isAuthenticated) return null;

  const navItems = isPrincipal ? adminNavItems : teacherNavItems;
  const sidebarWidth = collapsed ? 'w-[72px]' : 'w-64';

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isActive = (path) => {
    if (path === '/admin') return location.pathname === '/admin';
    if (path === '/dashboard') return location.pathname === '/dashboard';
    return location.pathname.startsWith(path);
  };

  return (
    <>
      {/* Mobile hamburger - only visible on small screens */}
      <button
        onClick={() => setMobileOpen(!mobileOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2.5 rounded-xl bg-[#0c0c14]/90 backdrop-blur-md border border-white/10 text-gray-400 hover:text-white hover:border-purple-500/30 transition-all shadow-lg"
        aria-label="Toggle navigation"
      >
        {mobileOpen ? <HiOutlineX size={20} /> : <HiOutlineMenu size={20} />}
      </button>

      {/* Mobile overlay backdrop */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="lg:hidden fixed inset-0 z-30 bg-black/60 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Fixed sidebar */}
      <aside
        className={`
          fixed top-0 left-0 h-full z-40 flex flex-col
          bg-[#0c0c14]/95 backdrop-blur-xl border-r border-white/[0.06]
          transition-all duration-300 ease-in-out
          ${sidebarWidth}
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        {/* Logo + collapse toggle */}
        <div className={`flex items-center border-b border-white/[0.06] flex-shrink-0 ${collapsed ? 'justify-center px-2 py-4' : 'px-4 py-4'}`}>
          <Link to={isPrincipal ? '/admin' : '/dashboard'} className="flex items-center gap-2.5 flex-shrink-0">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-cyan-500 flex items-center justify-center flex-shrink-0">
              <span className="text-white font-bold text-sm">IQ</span>
            </div>
            <AnimatePresence mode="wait">
              {!collapsed && (
                <motion.div
                  initial={{ opacity: 0, width: 0 }}
                  animate={{ opacity: 1, width: 'auto' }}
                  exit={{ opacity: 0, width: 0 }}
                  className="overflow-hidden flex items-center gap-2"
                >
                  <span className="text-lg font-semibold text-white whitespace-nowrap">
                    {t('app.name')}
                  </span>
                  {isPrincipal && (
                    <span className="px-1.5 py-0.5 rounded-full bg-purple-500/20 border border-purple-500/30 text-purple-400 text-[10px] font-medium whitespace-nowrap">
                      Principal
                    </span>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </Link>

          {/* Collapse toggle */}
          {!collapsed && (
            <button
              onClick={() => setCollapsed(true)}
              className="ml-auto p-1.5 rounded-lg text-gray-500 hover:text-white hover:bg-white/5 transition-all hidden lg:block"
              title="Collapse sidebar"
            >
              <HiOutlineChevronDoubleLeft size={16} />
            </button>
          )}
        </div>

        {/* Expand button when collapsed */}
        {collapsed && (
          <button
            onClick={() => setCollapsed(false)}
            className="absolute -right-3 top-[22px] p-1 rounded-md bg-[#0c0c14] border border-white/10 text-gray-400 hover:text-white hover:border-purple-500/30 transition-all shadow-lg z-10 hidden lg:block"
            title="Expand sidebar"
          >
            <HiOutlineChevronDoubleRight size={12} />
          </button>
        )}

        {/* Nav Items */}
        <nav className="flex-1 overflow-y-auto overflow-x-hidden hide-scrollbar py-3 px-2 space-y-0.5">
          {navItems.map((item) => {
            const active = isActive(item.path);
            const Icon = item.icon;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`
                  group relative flex items-center gap-3 rounded-lg transition-all duration-200
                  ${collapsed ? 'justify-center w-full p-3' : 'px-3 py-2.5'}
                  ${active
                    ? 'text-white bg-gradient-to-r from-purple-500/20 to-cyan-500/10 border border-purple-500/20'
                    : 'text-gray-400 hover:text-white hover:bg-white/5 border border-transparent'
                  }
                `}
                title={collapsed ? t(item.labelKey) : undefined}
              >
                <Icon size={20} className={`flex-shrink-0 ${active ? 'text-purple-400' : ''}`} />
                <AnimatePresence mode="wait">
                  {!collapsed && (
                    <motion.span
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -10 }}
                      className="text-sm font-medium whitespace-nowrap"
                    >
                      {t(item.labelKey)}
                    </motion.span>
                  )}
                </AnimatePresence>

                {/* Active indicator bar */}
                {active && !collapsed && (
                  <motion.div
                    layoutId="sidebar-active"
                    className="absolute left-0 top-1 bottom-1 w-0.5 bg-gradient-to-b from-purple-500 to-cyan-500 rounded-full"
                  />
                )}

                {/* Tooltip when collapsed */}
                {collapsed && (
                  <div className="absolute left-full ml-3 px-2.5 py-1.5 bg-gray-900 text-white text-xs rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all whitespace-nowrap pointer-events-none z-50 border border-white/10">
                    {t(item.labelKey)}
                  </div>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Bottom Section */}
        <div className="border-t border-white/[0.06] px-2 py-3 space-y-0.5 flex-shrink-0">
          {/* Workspace Selector - Teacher only */}
          {isTeacher && workspaces.length > 1 && (
            <div className="relative" ref={wsRef}>
              <button
                onClick={() => setShowWorkspaceSelector(!showWorkspaceSelector)}
                className={`
                  w-full flex items-center gap-3 rounded-lg transition-all text-xs
                  ${collapsed ? 'justify-center p-3' : 'px-3 py-2'}
                  text-gray-400 hover:text-white hover:bg-white/5 border border-transparent
                `}
                title={collapsed ? (activeWorkspace ? `${activeWorkspace.class_name} - ${activeWorkspace.subject_name}` : 'Switch workspace') : undefined}
              >
                <HiOutlineSwitchHorizontal size={18} className="flex-shrink-0 text-purple-400" />
                {!collapsed && (
                  <span className="truncate">
                    {activeWorkspace ? `${activeWorkspace.class_name} - ${activeWorkspace.subject_name}` : 'Switch'}
                  </span>
                )}
              </button>
              <AnimatePresence>
                {showWorkspaceSelector && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className={`absolute bottom-full mb-2 ${collapsed ? 'left-0' : 'left-0 right-0'} w-64 glass rounded-xl p-2 max-h-64 overflow-y-auto shadow-2xl`}
                  >
                    <p className="text-xs text-gray-500 px-3 py-2">Teaching Spaces</p>
                    {workspaces.map((ws) => (
                      <button
                        key={ws.assignment_id}
                        onClick={() => {
                          switchWorkspace(ws);
                          setShowWorkspaceSelector(false);
                        }}
                        className={`w-full text-left px-3 py-2.5 rounded-lg text-sm transition-colors ${
                          activeWorkspace?.assignment_id === ws.assignment_id
                            ? 'bg-purple-500/20 text-purple-400'
                            : 'text-gray-400 hover:text-white hover:bg-white/5'
                        }`}
                      >
                        <span className="font-medium">{ws.class_name}</span>
                        <span className="text-gray-500 ml-2">{ws.subject_name}</span>
                        <span className="text-gray-600 text-xs ml-2">({ws.students_count})</span>
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {/* Language Selector */}
          <div className="relative" ref={langRef}>
            <button
              onClick={() => setShowLanguage(!showLanguage)}
              className={`
                w-full flex items-center gap-3 rounded-lg transition-all
                ${collapsed ? 'justify-center p-3' : 'px-3 py-2'}
                text-gray-400 hover:text-white hover:bg-white/5 border border-transparent
              `}
              title={collapsed ? `${currentLanguage.native} (${currentLanguage.name})` : undefined}
            >
              <HiOutlineGlobe size={18} className="flex-shrink-0 text-cyan-400" />
              {!collapsed && (
                <span className="text-sm">{currentLanguage.native}</span>
              )}
            </button>
            <AnimatePresence>
              {showLanguage && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className={`absolute bottom-full mb-2 ${collapsed ? 'left-0' : 'left-0 right-0'} w-48 glass rounded-xl p-2 max-h-64 overflow-y-auto shadow-2xl`}
                >
                  {languages.map((lang) => (
                    <button
                      key={lang.code}
                      onClick={() => {
                        changeLanguage(lang.code);
                        setShowLanguage(false);
                      }}
                      className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                        currentLanguage.code === lang.code
                          ? 'bg-purple-500/20 text-purple-400'
                          : 'text-gray-400 hover:text-white hover:bg-white/5'
                      }`}
                    >
                      <span className="font-medium">{lang.native}</span>
                      <span className="text-gray-500 ml-2">({lang.name})</span>
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* User profile */}
          {!collapsed && (
            <div className="px-3 py-2 flex items-center gap-3 border-t border-white/[0.06] pt-3 mt-1">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center flex-shrink-0">
                <span className="text-white font-bold text-xs">
                  {user.name?.charAt(0)?.toUpperCase()}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">{user.name}</p>
                <p className="text-xs text-gray-500 truncate capitalize">{user.role}</p>
              </div>
            </div>
          )}

          {/* Logout button - ALWAYS visible */}
          <button
            onClick={handleLogout}
            className={`
              w-full flex items-center gap-3 rounded-lg transition-all group relative
              ${collapsed ? 'justify-center p-3' : 'px-3 py-2.5'}
              text-red-400 hover:text-red-300 hover:bg-red-500/10 border border-transparent hover:border-red-500/20
            `}
            title={collapsed ? t('nav.logout') : undefined}
          >
            <HiOutlineLogout size={20} className="flex-shrink-0" />
            {!collapsed && (
              <span className="text-sm font-medium">{t('nav.logout')}</span>
            )}
            {/* Tooltip when collapsed */}
            {collapsed && (
              <div className="absolute left-full ml-3 px-2.5 py-1.5 bg-red-900/80 text-white text-xs rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all whitespace-nowrap pointer-events-none z-50 border border-red-500/20">
                {t('nav.logout')}
              </div>
            )}
          </button>
        </div>
      </aside>

      {/* Spacer for flex layout - matches sidebar width, hidden on mobile */}
      <div
        className={`
          flex-shrink-0 transition-all duration-300 ease-in-out hidden lg:block
          ${sidebarWidth}
        `}
      />
    </>
  );
}
