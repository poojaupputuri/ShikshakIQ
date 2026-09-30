import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import AnimatedCard from '../components/AnimatedCard';
import { PageLoader } from '../components/LoadingScreen';
import EarlyWarningAlerts from '../components/EarlyWarningAlerts';
import { analyticsAPI, authAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import useRealtime from '../services/useRealtime';
import {
  HiOutlineUsers,
  HiOutlineAcademicCap,
  HiOutlineChartBar,
  HiOutlineExclamation,
  HiOutlineTrendingUp,
  HiOutlineArrowRight,
  HiOutlineSparkles,
  HiOutlineClipboardList,
  HiOutlineLightBulb,
  HiOutlineDocumentReport,
  HiOutlineSwitchHorizontal,
  HiOutlineBookOpen,
  HiOutlineRefresh,
  HiOutlineCalendar,
} from 'react-icons/hi';

export default function Dashboard() {
  const { t } = useTranslation();
  const { user, workspaces, activeWorkspace, switchWorkspace } = useAuth();
  const [workspaceData, setWorkspaceData] = useState(null);
  const lastWorkspaceIdRef = useRef(null);

  const { data, loading, refresh, isLive, lastUpdated } = useRealtime(
    async () => {
      if (!activeWorkspace?.assignment_id) return null;
      const res = await analyticsAPI.getDashboard({ assignment_id: activeWorkspace.assignment_id });
      return res.data;
    },
    { interval: 30_000, deps: [activeWorkspace?.assignment_id], enabled: !!activeWorkspace?.assignment_id }
  );

  // Fetch workspace data separately (doesn't need polling)
  useEffect(() => {
    if (activeWorkspace && activeWorkspace.assignment_id !== lastWorkspaceIdRef.current) {
      lastWorkspaceIdRef.current = activeWorkspace.assignment_id;
      authAPI.getWorkspace(activeWorkspace.assignment_id)
        .then(r => setWorkspaceData(r.data.workspace))
        .catch(err => console.error('Workspace fetch error:', err));
    }
  }, [activeWorkspace]);

  if (loading) return <PageLoader />;

  // No workspaces assigned - show empty state
  if (workspaces.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center py-16"
        >
          <HiOutlineBookOpen className="mx-auto text-gray-600 mb-4" size={48} />
          <h2 className="text-xl font-semibold text-white mb-2">No Teaching Spaces Assigned</h2>
          <p className="text-gray-400">Contact your principal to get assigned to classes and subjects.</p>
        </motion.div>
      </div>
    );
  }

  const statsCards = [
    {
      label: t('dashboard.totalStudents'),
      value: workspaceData?.students_count || data?.total_students || 0,
      icon: HiOutlineUsers,
      color: 'from-purple-500 to-purple-600',
      glow: 'purple',
    },
    {
      label: t('dashboard.totalQuizzes'),
      value: workspaceData?.quizzes_count || data?.total_quizzes || 0,
      icon: HiOutlineAcademicCap,
      color: 'from-cyan-500 to-cyan-600',
      glow: 'cyan',
    },
    {
      label: t('dashboard.averageScore'),
      value: `${data?.average_percentage || 0}%`,
      icon: HiOutlineTrendingUp,
      color: 'from-green-500 to-emerald-600',
      glow: 'green',
    },
    {
      label: 'Avg Mastery',
      value: workspaceData ? `${Math.round((workspaceData.average_mastery || 0) * 100)}%` : `${Math.round((data?.average_mastery || 0) * 100)}%`,
      icon: HiOutlineLightBulb,
      color: 'from-pink-500 to-rose-600',
      glow: 'pink',
    },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Welcome Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 mb-2">
            <HiOutlineSparkles className="text-purple-400" size={24} />
            <h1 className="text-2xl font-bold text-white">
              {t('dashboard.welcome', { name: user?.name?.split(' ')[0] || 'Teacher' })}
            </h1>
          </div>

          {/* Live indicator + refresh */}
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5 text-xs">
              <span className={`w-2 h-2 rounded-full ${isLive ? 'bg-green-500 animate-pulse' : 'bg-gray-500'}`} />
              <span className={isLive ? 'text-green-400' : 'text-gray-500'}>
                {isLive ? 'Live' : 'Off'}
              </span>
            </span>
            {lastUpdated && (
              <span className="text-[10px] text-gray-500">
                {new Date(lastUpdated).toLocaleTimeString()}
              </span>
            )}
            <motion.button
              onClick={refresh}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              disabled={loading}
              className="p-1.5 rounded-lg hover:bg-white/5 text-gray-400 hover:text-purple-400 transition-all disabled:opacity-40"
              title="Refresh now"
            >
              <HiOutlineRefresh size={16} className={loading ? 'animate-spin' : ''} />
            </motion.button>
          </div>
        </div>
      </motion.div>

      {/* Teaching Spaces (Workspace Cards) */}
      {workspaces.length > 0 && (
        <div className="mb-8">
          <h2 className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
            <HiOutlineSwitchHorizontal size={16} />
            Your Teaching Spaces
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {workspaces.map((ws, i) => (
              <motion.button
                key={ws.assignment_id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                onClick={() => switchWorkspace(ws)}
                className={`relative p-4 rounded-xl border text-left transition-all ${
                  activeWorkspace?.assignment_id === ws.assignment_id
                    ? 'bg-purple-500/15 border-purple-500/40 shadow-lg shadow-purple-500/10'
                    : 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-purple-500/20'
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-lg bg-gradient-to-br from-purple-500 to-cyan-500">
                      <HiOutlineBookOpen className="text-white" size={16} />
                    </div>
                    <div>
                      <p className="text-white font-semibold text-sm">{ws.class_name}</p>
                      <p className="text-cyan-400 text-xs">{ws.subject_name}</p>
                    </div>
                  </div>
                  {activeWorkspace?.assignment_id === ws.assignment_id && (
                    <span className="px-2 py-0.5 rounded-full bg-purple-500/30 text-purple-300 text-[10px] font-medium">
                      Active
                    </span>
                  )}
                </div>
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span>{ws.students_count} students</span>
                  {ws.academic_year && <span>{ws.academic_year}</span>}
                </div>
              </motion.button>
            ))}
          </div>
        </div>
      )}

      {/* Active Workspace Details Banner */}
      {activeWorkspace && workspaceData && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 relative overflow-hidden rounded-2xl bg-gradient-to-r from-purple-900/40 via-cyan-900/20 to-purple-900/40 border border-purple-500/20"
        >
          {/* Decorative gradient orbs */}
          <div className="absolute -top-10 -right-10 w-40 h-40 bg-purple-500/10 rounded-full blur-3xl" />
          <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-cyan-500/10 rounded-full blur-3xl" />

          <div className="relative p-5">
            <div className="flex items-start justify-between flex-wrap gap-4">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-gradient-to-br from-purple-500 to-cyan-500 shadow-lg shadow-purple-500/20">
                  <HiOutlineBookOpen className="text-white" size={24} />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 text-[10px] font-medium uppercase tracking-wider">
                      Active Teaching Space
                    </span>
                    {activeWorkspace.academic_year && (
                      <span className="px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 text-[10px] font-medium flex items-center gap-1">
                        <HiOutlineCalendar size={10} />
                        {activeWorkspace.academic_year}
                      </span>
                    )}
                  </div>
                  <h2 className="text-xl font-bold text-white">
                    {activeWorkspace.class_name}
                  </h2>
                  <p className="text-cyan-400 text-sm font-medium">
                    {activeWorkspace.subject_name}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4 sm:gap-6 flex-wrap">
                <div className="text-center">
                  <p className="text-2xl font-bold text-white">{workspaceData.students_count}</p>
                  <p className="text-[10px] text-gray-400 uppercase tracking-wider">Students</p>
                </div>
                <div className="w-px h-8 bg-white/10" />
                <div className="text-center">
                  <p className="text-2xl font-bold text-white">{workspaceData.quizzes_count}</p>
                  <p className="text-[10px] text-gray-400 uppercase tracking-wider">Quizzes</p>
                </div>
                <div className="w-px h-8 bg-white/10" />
                <div className="text-center">
                  <p className="text-2xl font-bold text-emerald-400">{Math.round((workspaceData.average_mastery || 0) * 100)}%</p>
                  <p className="text-[10px] text-gray-400 uppercase tracking-wider">Avg Mastery</p>
                </div>
              </div>
            </div>

          </div>
        </motion.div>
      )}

      {/* Active Workspace Stats */}
      {activeWorkspace && (
        <>
          {/* Early Warning Alerts */}
          <EarlyWarningAlerts assignmentId={activeWorkspace?.assignment_id} />

          {/* Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {statsCards.map((stat, i) => (
              <AnimatedCard key={stat.label} delay={i * 0.1} glow={stat.glow}>
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-gray-400 text-sm mb-1">{stat.label}</p>
                    <p className="text-3xl font-bold text-white">{stat.value}</p>
                  </div>
                  <div className={`p-3 rounded-xl bg-gradient-to-br ${stat.color} bg-opacity-20`}>
                    <stat.icon className="text-white" size={24} />
                  </div>
                </div>
              </AnimatedCard>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Quick Actions */}
            <AnimatedCard delay={0.2} glow="purple">
              <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <HiOutlineClipboardList className="text-purple-400" />
                {t('dashboard.quickActions')}
              </h2>
              <div className="space-y-3">
                <Link
                  to="/students"
                  className="flex items-center justify-between p-3 rounded-xl bg-white/5 hover:bg-purple-500/10 border border-white/10 hover:border-purple-500/30 transition-all group"
                >
                  <span className="flex items-center gap-3">
                    <HiOutlineUsers className="text-purple-400" size={20} />
                    <span className="text-sm text-gray-300">{t('dashboard.addStudent')}</span>
                  </span>
                  <HiOutlineArrowRight className="text-gray-500 group-hover:text-purple-400 transition-colors" size={18} />
                </Link>
                <Link
                  to="/quizzes"
                  className="flex items-center justify-between p-3 rounded-xl bg-white/5 hover:bg-cyan-500/10 border border-white/10 hover:border-cyan-500/30 transition-all group"
                >
                  <span className="flex items-center gap-3">
                    <HiOutlineAcademicCap className="text-cyan-400" size={20} />
                    <span className="text-sm text-gray-300">{t('dashboard.createQuiz')}</span>
                  </span>
                  <HiOutlineArrowRight className="text-gray-500 group-hover:text-cyan-400 transition-colors" size={18} />
                </Link>
                <Link
                  to="/paper-analysis"
                  className="flex items-center justify-between p-3 rounded-xl bg-white/5 hover:bg-pink-500/10 border border-white/10 hover:border-pink-500/30 transition-all group"
                >
                  <span className="flex items-center gap-3">
                    <HiOutlineChartBar className="text-pink-400" size={20} />
                    <span className="text-sm text-gray-300">{t('dashboard.uploadPapers')}</span>
                  </span>
                  <HiOutlineArrowRight className="text-gray-500 group-hover:text-pink-400 transition-colors" size={18} />
                </Link>
                <Link
                  to="/reports"
                  className="flex items-center justify-between p-3 rounded-xl bg-white/5 hover:bg-green-500/10 border border-white/10 hover:border-green-500/30 transition-all group"
                >
                  <span className="flex items-center gap-3">
                    <HiOutlineDocumentReport className="text-green-400" size={20} />
                    <span className="text-sm text-gray-300">{t('dashboard.viewReports')}</span>
                  </span>
                  <HiOutlineArrowRight className="text-gray-500 group-hover:text-green-400 transition-colors" size={18} />
                </Link>
              </div>
            </AnimatedCard>

            {/* Weak Concepts & Risk Students */}
            <AnimatedCard delay={0.3} glow="pink">
              <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <HiOutlineExclamation className="text-pink-400" />
                {t('analytics.needsSupport')}
              </h2>

              {data?.weak_concepts?.length > 0 && (
                <div className="mb-4">
                  <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">{t('analytics.repeatedWeakness')}</p>
                  <div className="space-y-2">
                    {data.weak_concepts.slice(0, 4).map((item) => (
                      <div key={item.concept} className="flex items-center justify-between p-2 rounded-lg bg-white/5">
                        <span className="text-sm text-gray-300">{item.concept}</span>
                        <span className="text-xs text-red-400">{item.affected_students} {t('students.title')}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {data?.risk_students?.length > 0 && (
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">{t('analytics.riskPredictionDesc')}</p>
                  <div className="space-y-2">
                    {data.risk_students.slice(0, 4).map((student) => (
                      <Link
                        key={student.id}
                        to={`/analytics?student=${student.id}`}
                        className="flex items-center justify-between p-2 rounded-lg bg-white/5 hover:bg-red-500/10 transition-all"
                      >
                        <span className="text-sm text-gray-300">{student.name}</span>
                        <span className="text-xs text-red-400">{Math.round(student.avg_mastery * 100)}% {t('analytics.masteryLevel')}</span>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {(!data?.weak_concepts?.length && !data?.risk_students?.length) && (
                <div className="text-center py-8 text-gray-500">
                  <HiOutlineLightBulb className="mx-auto mb-2" size={32} />
                  <p className="text-sm">{t('dashboard.recentActivity')}</p>
                </div>
              )}
            </AnimatedCard>
          </div>

          {/* Recent Quizzes */}
          {data?.recent_quizzes?.length > 0 && (
            <AnimatedCard delay={0.4} className="mt-6" glow="cyan">
              <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <HiOutlineAcademicCap className="text-cyan-400" />
                {t('dashboard.recentActivity')}
              </h2>
              <div className="space-y-3">
                {data.recent_quizzes.map((quiz, i) => (
                  <motion.div
                    key={quiz.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.1 }}
                    className="flex items-center justify-between p-3 rounded-lg bg-white/5"
                  >
                    <div>
                      <p className="text-sm font-medium text-white">{quiz.title}</p>
                      <p className="text-xs text-gray-400">
                        {quiz.subject} • {quiz.difficulty} • {quiz.questions_count} {t('quizzes.questions')}
                      </p>
                    </div>
                    <Link
                      to={`/quizzes`}
                      className="px-3 py-1.5 rounded-lg bg-purple-500/20 text-purple-400 text-xs hover:bg-purple-500/30 transition-all"
                    >
                      {t('app.preview')}
                    </Link>
                  </motion.div>
                ))}
              </div>
            </AnimatedCard>
          )}
        </>
      )}
    </div>
  );
}
