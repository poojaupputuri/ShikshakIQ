import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import AnimatedCard from '../components/AnimatedCard';
import { PageLoader } from '../components/LoadingScreen';
import { analyticsAPI, studentAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import useRealtime from '../services/useRealtime';
import {
  HiOutlineChartBar,
  HiOutlineLightBulb,
  HiOutlineExclamation,
  HiOutlineTrendingUp,
  HiOutlineUserGroup,
  HiOutlineAcademicCap,
  HiOutlineSparkles,
  HiOutlineRefresh,
} from 'react-icons/hi';

export default function Analytics() {
  const { t } = useTranslation();
  const { user, activeWorkspace } = useAuth();
  const [searchParams] = useSearchParams();
  const studentIdParam = searchParams.get('student');

  const [view, setView] = useState(studentIdParam ? 'student' : 'class');
  const [students, setStudents] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(studentIdParam || '');
  const [studentData, setStudentData] = useState(null);
  const [studentLoading, setStudentLoading] = useState(false);

  // Real-time class analytics (polls every 30s) — scoped to the active workspace
  const {
    data: classData,
    loading: classLoading,
    refresh: refreshClass,
    isLive,
    lastUpdated,
  } = useRealtime(
    async () => {
      if (!activeWorkspace?.assignment_id) return null;
      const res = await analyticsAPI.getClassAnalytics({ assignment_id: activeWorkspace.assignment_id });
      return res.data;
    },
    {
      interval: studentIdParam ? 0 : 30_000,
      deps: [activeWorkspace?.assignment_id],
      enabled: !studentIdParam && !!activeWorkspace?.assignment_id,
    }
  );

  useEffect(() => {
    fetchStudents();
  }, [activeWorkspace]);

  useEffect(() => {
    if (selectedStudent) {
      fetchStudentAnalytics(selectedStudent);
    }
  }, [selectedStudent]);

  const fetchStudents = async () => {
    try {
      const params = {};
      if (activeWorkspace) params.assignment_id = activeWorkspace.assignment_id;
      const res = await studentAPI.getAll(params);
      setStudents(res.data.students || []);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchStudentAnalytics = async (id) => {
    setStudentLoading(true);
    try {
      const res = await analyticsAPI.getStudentAnalytics(id);
      setStudentData(res.data);
      setView('student');
    } catch (err) {
      console.error(err);
    } finally {
      setStudentLoading(false);
    }
  };

  if ((classLoading && !classData) || (studentLoading && !studentData)) return <PageLoader />;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-white flex items-center gap-3 mb-2">
            <HiOutlineChartBar className="text-purple-400" />
            {t('analytics.title')}
          </h1>

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
              onClick={() => view === 'class' ? refreshClass() : fetchStudentAnalytics(selectedStudent)}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              disabled={view === 'class' ? classLoading : studentLoading}
              className="p-1.5 rounded-lg hover:bg-white/5 text-gray-400 hover:text-purple-400 transition-all disabled:opacity-40"
              title="Refresh now"
            >
              <HiOutlineRefresh size={16} className={(view === 'class' ? classLoading : studentLoading) ? 'animate-spin' : ''} />
            </motion.button>
          </div>
        </div>

        {/* View Toggle */}
        <div className="flex items-center gap-4 mt-4">
          <div className="flex rounded-xl border border-white/10 p-1">
            <button
              onClick={() => { setView('class'); setSelectedStudent(''); refreshClass(); }}
              className={`px-4 py-2 rounded-lg text-sm transition-all ${view === 'class' ? 'bg-purple-500/20 text-purple-400' : 'text-gray-400 hover:text-white'}`}
            >
              <span className="flex items-center gap-2"><HiOutlineUserGroup size={16} />{t('analytics.title')}</span>
            </button>
            <button
              onClick={() => setView('student')}
              className={`px-4 py-2 rounded-lg text-sm transition-all ${view === 'student' ? 'bg-purple-500/20 text-purple-400' : 'text-gray-400 hover:text-white'}`}
            >
              <span className="flex items-center gap-2"><HiOutlineAcademicCap size={16} />{t('analytics.studentMastery')}</span>
            </button>
          </div>

          {view === 'student' && (
            <select
              value={selectedStudent}
              onChange={(e) => setSelectedStudent(e.target.value)}
              className="bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white text-sm focus:outline-none input-glow"
            >
              <option value="" className="bg-gray-900">{t('students.selectClass')}</option>
              {students.map((s) => (
                <option key={s.id} value={s.id} className="bg-gray-900">{s.name} ({s.roll_number})</option>
              ))}
            </select>
          )}
        </div>
      </motion.div>

      {/* Class Overview */}
      {view === 'class' && classData && (
        <ClassAnalyticsView data={classData} />
      )}

      {/* Student Deep Dive */}
      {view === 'student' && studentData && (
        <StudentAnalyticsView data={studentData} />
      )}

      {view === 'student' && !selectedStudent && (
        <div className="text-center py-16 text-gray-500">
          <HiOutlineAcademicCap className="mx-auto mb-4" size={48} />
          <p>{t('students.selectClass')}</p>
        </div>
      )}
    </div>
  );
}

function ClassAnalyticsView({ data }) {
  const { t } = useTranslation();
  return (
    <div>
      {/* Class Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <AnimatedCard glow="purple" delay={0}>
          <p className="text-gray-400 text-xs mb-1">{t('analytics.title')}</p>
          <p className="text-2xl font-bold text-white">{data.class_average || 0}%</p>
        </AnimatedCard>
        <AnimatedCard glow="cyan" delay={0.1}>
          <p className="text-gray-400 text-xs mb-1">{t('analytics.conceptMastery')}</p>
          <p className="text-2xl font-bold text-white">{Math.round((data.class_mastery || 0) * 100)}%</p>
        </AnimatedCard>
        <AnimatedCard glow="green" delay={0.2}>
          <p className="text-gray-400 text-xs mb-1">{t('dashboard.totalStudents')}</p>
          <p className="text-2xl font-bold text-white">{data.total_students}</p>
        </AnimatedCard>
      </div>

      {/* Student Performance Table */}
      <AnimatedCard glow="purple" delay={0.3}>
        <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <HiOutlineTrendingUp className="text-cyan-400" />
          {t('dashboard.performance')}
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 border-b border-white/10">
                <th className="pb-3 pr-4">{t('students.studentName')}</th>
                <th className="pb-3 pr-4">{t('students.rollNumber')}</th>
                <th className="pb-3 pr-4">{t('analytics.score')}</th>
                <th className="pb-3 pr-4">{t('analytics.masteryLevel')}</th>
                <th className="pb-3 pr-4">{t('students.quizzesTaken')}</th>
              </tr>
            </thead>
            <tbody>
              {data.student_performance?.map((s, i) => (
                <motion.tr
                  key={s.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.03 }}
                  className="border-b border-white/5 hover:bg-white/5 transition-colors"
                >
                  <td className="py-3 pr-4 text-white">{s.name}</td>
                  <td className="py-3 pr-4 text-gray-400">{s.roll_number}</td>
                  <td className="py-3 pr-4">
                    <span className={`px-2 py-0.5 rounded text-xs ${
                      s.average_percentage >= 70 ? 'bg-green-500/20 text-green-400' :
                      s.average_percentage >= 40 ? 'bg-yellow-500/20 text-yellow-400' :
                      'bg-red-500/20 text-red-400'
                    }`}>{s.average_percentage}%</span>
                  </td>
                  <td className="py-3 pr-4">
                    <div className="flex items-center gap-2">
                      <div className="w-20 h-1.5 rounded-full bg-white/10 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-purple-500 to-cyan-500"
                          style={{ width: `${Math.round(s.average_mastery * 100)}%` }}
                        />
                      </div>
                      <span className="text-xs text-gray-400">{Math.round(s.average_mastery * 100)}%</span>
                    </div>
                  </td>
                  <td className="py-3 text-gray-400">{s.quizzes_taken}</td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </AnimatedCard>

      {/* Concept Summary */}
      {data.concept_summary?.length > 0 && (
        <AnimatedCard glow="pink" delay={0.4} className="mt-6">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <HiOutlineLightBulb className="text-pink-400" />
            {t('analytics.conceptMastery')}
          </h2>
          <div className="space-y-3">
            {data.concept_summary.slice(0, 10).map((c, i) => (
              <div key={c.concept} className="flex items-center justify-between">
                <span className="text-sm text-gray-300">{c.concept}</span>
                <div className="flex items-center gap-3">
                  <div className="w-32 h-1.5 rounded-full bg-white/10 overflow-hidden">
                    <div
                      className={`h-full rounded-full ${c.avg_mastery >= 0.7 ? 'bg-green-500' : c.avg_mastery >= 0.4 ? 'bg-yellow-500' : 'bg-red-500'}`}
                      style={{ width: `${Math.round(c.avg_mastery * 100)}%` }}
                    />
                  </div>
                  <span className="text-xs text-gray-400 w-10 text-right">{Math.round(c.avg_mastery * 100)}%</span>
                </div>
              </div>
            ))}
          </div>
        </AnimatedCard>
      )}

      {/* Teacher Report */}
      {data.teacher_report && (
        <AnimatedCard glow="green" delay={0.5} className="mt-6">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <HiOutlineSparkles className="text-green-400" />
            {t('analytics.insight')}
          </h2>
          <div className="space-y-3">
            <p className="text-sm text-gray-300">{data.teacher_report.summary}</p>
            {data.teacher_report.recommendations?.length > 0 && (
              <div>
                <p className="text-xs text-gray-500 uppercase mb-2">{t('reports.title')}</p>
                <ul className="space-y-1">
                  {data.teacher_report.recommendations.map((rec, i) => (
                    <li key={i} className="text-sm text-gray-400 flex items-start gap-2">
                      <span className="text-green-400 mt-1">•</span> {rec}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </AnimatedCard>
      )}
    </div>
  );
}

function StudentAnalyticsView({ data }) {
  const { t } = useTranslation();
  const student = data.student;

  return (
    <div>
      {/* Student Header */}
      <AnimatedCard glow="purple" className="mb-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
            <span className="text-2xl font-bold text-white">{student?.name?.charAt(0)}</span>
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">{student?.name}</h2>
            <p className="text-gray-400 text-sm">
              {t('students.rollNumber')}: {student?.roll_number} • {student?.class_name} • {t('students.section')} {student?.section}
            </p>
            {data.is_at_risk && (
              <span className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded bg-red-500/20 text-red-400 text-xs">
                <HiOutlineExclamation size={12} /> {t('analytics.needsSupport')}
              </span>
            )}
          </div>
        </div>
      </AnimatedCard>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6">
        <AnimatedCard glow="purple" delay={0}>
          <p className="text-gray-400 text-xs mb-1">{t('analytics.studentMastery')}</p>
          <p className="text-2xl font-bold text-white">{Math.round((data.overall_mastery || 0) * 100)}%</p>
        </AnimatedCard>
        <AnimatedCard glow="cyan" delay={0.1}>
          <p className="text-gray-400 text-xs mb-1">{t('analytics.discrimination')}</p>
          <p className="text-2xl font-bold text-white">{data.irt_ability?.toFixed(2) || '0.00'}</p>
        </AnimatedCard>
        <AnimatedCard glow="pink" delay={0.2}>
          <p className="text-gray-400 text-xs mb-1">{t('analytics.riskPrediction')}</p>
          <p className="text-2xl font-bold text-white">{Math.round((data.risk_score || 0) * 100)}%</p>
        </AnimatedCard>
        <AnimatedCard glow="green" delay={0.3}>
          <p className="text-gray-400 text-xs mb-1">{t('students.quizzesTaken')}</p>
          <p className="text-2xl font-bold text-white">{data.performance_timeline?.length || 0}</p>
        </AnimatedCard>
      </div>

      {/* Performance Timeline */}
      {data.performance_timeline?.length > 0 && (
        <AnimatedCard glow="cyan" className="mb-6">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <HiOutlineTrendingUp className="text-cyan-400" />
            {t('analytics.growthTimeline')}
          </h2>
          <div className="space-y-3">
            {data.performance_timeline.reverse().map((p, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className="flex items-center justify-between p-3 rounded-lg bg-white/5"
              >
                <div>
                  <p className="text-sm text-white">{p.quiz_title}</p>
                  <p className="text-xs text-gray-500">{new Date(p.date).toLocaleDateString()}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm text-gray-400">{p.score}/{p.total_marks}</span>
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                    p.percentage >= 70 ? 'bg-green-500/20 text-green-400' :
                    p.percentage >= 40 ? 'bg-yellow-500/20 text-yellow-400' :
                    'bg-red-500/20 text-red-400'
                  }`}>{p.percentage}%</span>
                </div>
              </motion.div>
            ))}
          </div>
        </AnimatedCard>
      )}

      {/* Concept Masteries */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <AnimatedCard glow="purple">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <HiOutlineLightBulb className="text-purple-400" />
            {t('analytics.conceptMastery')}
          </h2>
          {data.masteries?.length > 0 ? (
            <div className="space-y-3">
              {data.masteries.map((m, i) => (
                <motion.div
                  key={m.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-gray-300">{m.concept_name}</span>
                    <span className="text-xs text-gray-400">{Math.round(m.mastery_level * 100)}%</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden">
                    <motion.div
                      className={`h-full rounded-full ${
                        m.mastery_level >= 0.7 ? 'bg-gradient-to-r from-green-500 to-emerald-500' :
                        m.mastery_level >= 0.4 ? 'bg-gradient-to-r from-yellow-500 to-orange-500' :
                        'bg-gradient-to-r from-red-500 to-pink-500'
                      }`}
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.round(m.mastery_level * 100)}%` }}
                      transition={{ duration: 1, delay: i * 0.1 }}
                    />
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-sm text-center py-4">{t('app.noData')}</p>
          )}
        </AnimatedCard>

        {/* Weak Concepts & BKT */}
        <AnimatedCard glow="pink">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <HiOutlineExclamation className="text-pink-400" />
            {t('analytics.repeatedWeakness')}
          </h2>

          {data.weak_concepts?.length > 0 && (
            <div className="mb-4">
              <p className="text-xs text-gray-500 uppercase mb-2">{t('analytics.needsSupport')}</p>
              <div className="space-y-2">
                {data.weak_concepts.map((wc, i) => (
                  <div key={wc.id} className="flex items-center justify-between p-2 rounded-lg bg-red-500/5 border border-red-500/10">
                    <span className="text-sm text-gray-300">{wc.concept_name}</span>
                    <span className="text-xs text-red-400">{Math.round(wc.mastery_level * 100)}%</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {data.bkt_tracking?.length > 0 && (
            <div>
              <p className="text-xs text-gray-500 uppercase mb-2">{t('analytics.bktParameters')}</p>
              <div className="space-y-2">
                {data.bkt_tracking.slice(0, 5).map((bkt, i) => (
                  <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-white/5">
                    <span className="text-sm text-gray-300">{bkt.concept}</span>
                    <span className="text-xs text-cyan-400">P(know) = {bkt.p_know.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {!data.weak_concepts?.length && !data.bkt_tracking?.length && (
            <p className="text-gray-500 text-sm text-center py-4">{t('app.noData')}</p>
          )}
        </AnimatedCard>
      </div>

      {/* AI Report */}
      {data.ai_report && (
        <AnimatedCard glow="green">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <HiOutlineSparkles className="text-green-400" />
            {t('analytics.insight')}
          </h2>
          <div className="space-y-4">
            <p className="text-sm text-gray-300">{data.ai_report.summary}</p>

            {data.ai_report.strengths?.length > 0 && (
              <div>
                <p className="text-xs text-green-400 uppercase mb-2">{t('analytics.status')}</p>
                <ul className="space-y-1">
                  {data.ai_report.strengths.map((s, i) => (
                    <li key={i} className="text-sm text-gray-400 flex items-start gap-2">
                      <span className="text-green-400">•</span> {s}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {data.ai_report.recommendations?.length > 0 && (
              <div>
                <p className="text-xs text-purple-400 uppercase mb-2">{t('reports.title')}</p>
                <ul className="space-y-1">
                  {data.ai_report.recommendations.map((r, i) => (
                    <li key={i} className="text-sm text-gray-400 flex items-start gap-2">
                      <span className="text-purple-400">•</span> {r}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {data.ai_report.next_steps?.length > 0 && (
              <div>
                <p className="text-xs text-cyan-400 uppercase mb-2">{t('success.saved')}</p>
                <ul className="space-y-1">
                  {data.ai_report.next_steps.map((ns, i) => (
                    <li key={i} className="text-sm text-gray-400 flex items-start gap-2">
                      <span className="text-cyan-400">•</span> {ns}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </AnimatedCard>
      )}
    </div>
  );
}
