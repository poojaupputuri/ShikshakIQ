
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { adminAPI } from '../../services/api';
import AnimatedCard from '../../components/AnimatedCard';
import { PageLoader } from '../../components/LoadingScreen';
import { useAuth } from '../../context/AuthContext';
import useRealtime from '../../services/useRealtime';
import {
  HiOutlineUsers,
  HiOutlineBookOpen,
  HiOutlineClipboardList,
  HiOutlineAcademicCap,
  HiOutlineSwitchHorizontal,
  HiOutlineCog,
  HiOutlineSparkles,
  HiOutlineExclamation,
  HiOutlineCheckCircle,
  HiOutlineRefresh,
} from 'react-icons/hi';

export default function PrincipalDashboard() {
  const { user } = useAuth();
  const { data: stats, loading, refresh, isLive, lastUpdated } = useRealtime(
    () => adminAPI.getDashboard().then(r => r.data),
    { interval: 30_000 }
  );

  if (loading) return <PageLoader />;

  const statCards = [
    {
      label: 'Teachers',
      value: stats?.total_teachers || 0,
      icon: HiOutlineUsers,
      color: 'from-purple-500 to-purple-600',
      link: '/admin/teachers',
      glow: 'purple',
    },
    {
      label: 'Classes',
      value: stats?.total_classes || 0,
      icon: HiOutlineBookOpen,
      color: 'from-cyan-500 to-cyan-600',
      link: '/admin/classes',
      glow: 'cyan',
    },
    {
      label: 'Subjects',
      value: stats?.total_subjects || 0,
      icon: HiOutlineClipboardList,
      color: 'from-green-500 to-emerald-600',
      link: '/admin/subjects',
      glow: 'green',
    },
    {
      label: 'Students',
      value: stats?.total_students || 0,
      icon: HiOutlineAcademicCap,
      color: 'from-pink-500 to-rose-600',
      glow: 'pink',
    },
    {
      label: 'Assignments',
      value: stats?.total_assignments || 0,
      icon: HiOutlineSwitchHorizontal,
      color: 'from-amber-500 to-orange-600',
      link: '/admin/assignments',
      glow: 'amber',
    },
    {
      label: 'Active Teachers',
      value: stats?.total_teachers - (stats?.inactive_teachers || 0) || 0,
      sub: `${stats?.inactive_teachers || 0} inactive`,
      icon: HiOutlineCheckCircle,
      color: 'from-teal-500 to-teal-600',
      glow: 'teal',
    },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <HiOutlineSparkles className="text-purple-400" size={24} />
              <h1 className="text-2xl font-bold text-white">
                Principal Dashboard
              </h1>
            </div>
            <p className="text-gray-400">
              Welcome back, {user?.name?.split(' ')[0] || 'Principal'} • {stats?.school_name || 'Shikshak International School'}
              {stats?.active_academic_year && (
                <> • {stats.active_academic_year.name}</>
              )}
            </p>
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

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {statCards.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
          >
            <Link to={stat.link || '#'}>
              <AnimatedCard glow={stat.glow}>
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-gray-400 text-sm mb-1">{stat.label}</p>
                    <p className="text-3xl font-bold text-white">{stat.value}</p>
                    {stat.sub && <p className="text-xs text-gray-500 mt-1">{stat.sub}</p>}
                  </div>
                  <div className={`p-3 rounded-xl bg-gradient-to-br ${stat.color} bg-opacity-20`}>
                    <stat.icon className="text-white" size={24} />
                  </div>
                </div>
              </AnimatedCard>
            </Link>
          </motion.div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <AnimatedCard glow="purple">
          <h2 className="text-lg font-semibold text-white mb-4">Quick Actions</h2>
          <div className="space-y-3">
            <Link
              to="/admin/teachers"
              className="flex items-center justify-between p-3 rounded-xl bg-white/5 hover:bg-purple-500/10 border border-white/10 hover:border-purple-500/30 transition-all group"
            >
              <span className="flex items-center gap-3">
                <HiOutlineUsers className="text-purple-400" size={20} />
                <span className="text-sm text-gray-300">Manage Teachers</span>
              </span>
              <span className="text-xs text-purple-400 group-hover:text-purple-300">Create, edit, assign</span>
            </Link>
            <Link
              to="/admin/assignments"
              className="flex items-center justify-between p-3 rounded-xl bg-white/5 hover:bg-cyan-500/10 border border-white/10 hover:border-cyan-500/30 transition-all group"
            >
              <span className="flex items-center gap-3">
                <HiOutlineSwitchHorizontal className="text-cyan-400" size={20} />
                <span className="text-sm text-gray-300">Assign Teachers</span>
              </span>
              <span className="text-xs text-cyan-400 group-hover:text-cyan-300">Teacher → Class → Subject</span>
            </Link>
            <Link
              to="/admin/classes"
              className="flex items-center justify-between p-3 rounded-xl bg-white/5 hover:bg-green-500/10 border border-white/10 hover:border-green-500/30 transition-all group"
            >
              <span className="flex items-center gap-3">
                <HiOutlineBookOpen className="text-green-400" size={20} />
                <span className="text-sm text-gray-300">Manage Classes</span>
              </span>
              <span className="text-xs text-green-400 group-hover:text-green-300">Add sections</span>
            </Link>
            <Link
              to="/admin/academic-years"
              className="flex items-center justify-between p-3 rounded-xl bg-white/5 hover:bg-pink-500/10 border border-white/10 hover:border-pink-500/30 transition-all group"
            >
              <span className="flex items-center gap-3">
                <HiOutlineCog className="text-pink-400" size={20} />
                <span className="text-sm text-gray-300">Academic Years</span>
              </span>
              <span className="text-xs text-pink-400 group-hover:text-pink-300">Setup & activate</span>
            </Link>
          </div>
        </AnimatedCard>

        <AnimatedCard glow="cyan">
          <h2 className="text-lg font-semibold text-white mb-4">School Overview</h2>
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-white/5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-400">Academic Year</span>
                <span className="text-sm text-white font-medium">
                  {stats?.active_academic_year?.name || 'Not set'}
                </span>
              </div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-400">Teacher-Student Ratio</span>
                <span className="text-sm text-white font-medium">
                  {stats?.total_teachers > 0
                    ? `1:${Math.round(stats.total_students / stats.total_teachers)}`
                    : 'N/A'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-400">Avg Assignments/Teacher</span>
                <span className="text-sm text-white font-medium">
                  {stats?.total_teachers > 0
                    ? (stats.total_assignments / stats.total_teachers).toFixed(1)
                    : '0'}
                </span>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-gradient-to-r from-purple-500/10 to-cyan-500/10 border border-purple-500/20">
              <p className="text-sm text-gray-300">
                {stats?.inactive_teachers > 0 ? (
                  <span className="flex items-center gap-2">
                    <HiOutlineExclamation className="text-amber-400" size={16} />
                    {stats.inactive_teachers} teacher(s) are inactive
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <HiOutlineCheckCircle className="text-green-400" size={16} />
                    All teachers are active
                  </span>
                )}
              </p>
            </div>
          </div>
        </AnimatedCard>
      </div>
    </div>
  );
}
