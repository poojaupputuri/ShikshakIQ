import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import AnimatedCard from '../components/AnimatedCard';
import { PageLoader } from '../components/LoadingScreen';
import { analyticsAPI, studentAPI } from '../services/api';
import { useTranslation } from 'react-i18next';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import useRealtime from '../services/useRealtime';
import {
  HiOutlineDocumentReport,
  HiOutlineUserGroup,
  HiOutlineAcademicCap,
  HiOutlineTranslate,
  HiOutlineSparkles,
  HiOutlineMail,
  HiOutlineChat,
  HiOutlineRefresh,
} from 'react-icons/hi';

export default function Reports() {
  const { t } = useTranslation();
  const { user, activeWorkspace } = useAuth();
  const { currentLanguage, changeLanguage, languages } = useLanguage();
  const [students, setStudents] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState('');
  const [reportType, setReportType] = useState('student');
  const [generating, setGenerating] = useState(false);
  const [report, setReport] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  // Real-time student list refresh
  const { lastUpdated, refresh, isLive } = useRealtime(
    () => studentAPI.getAll().then(r => {
      setStudents(r.data.students || []);
    }),
    { interval: 30_000, immediate: false, deps: [activeWorkspace?.assignment_id] }
  );

  useEffect(() => {
    fetchStudents();
  }, [activeWorkspace]);

  const fetchStudents = async () => {
    try {
      const params = {};
      if (activeWorkspace) params.assignment_id = activeWorkspace.assignment_id;
      const res = await studentAPI.getAll(params);
      setStudents(res.data.students || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async () => {
    if (!selectedStudent) {
      setError('Please select a student');
      return;
    }
    setGenerating(true);
    setError('');
    setReport(null);

    try {
      const res = await analyticsAPI.generateReport({
        student_id: parseInt(selectedStudent),
        report_type: reportType,
        language: currentLanguage.code,
      });
      setReport(res.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to generate report');
    } finally {
      setGenerating(false);
    }
  };

  const copyWhatsAppMessage = () => {
    if (report?.parent_whatsapp_message) {
      navigator.clipboard.writeText(report.parent_whatsapp_message);
      alert('WhatsApp message copied to clipboard!');
    }
  };

  if (loading) return <PageLoader />;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-3 mb-2">
              <HiOutlineDocumentReport className="text-purple-400" />
              {t('reports.title')}
            </h1>
            <p className="text-gray-400 text-sm">
              {t('reports.description')}
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
              className="p-1.5 rounded-lg hover:bg-white/5 text-gray-400 hover:text-purple-400 transition-all"
              title="Refresh students"
            >
              <HiOutlineRefresh size={16} />
            </motion.button>
          </div>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Controls */}
        <div className="lg:col-span-1 space-y-4">
          <AnimatedCard glow="purple">
            <h2 className="text-lg font-semibold text-white mb-4">{t('reports.reportSettings')}</h2>

            {/* Student Select */}
            <div className="mb-4">
              <label className="block text-sm text-gray-300 mb-1.5">{t('reports.student')}</label>
              <select
                value={selectedStudent}
                onChange={(e) => { setSelectedStudent(e.target.value); setReport(null); }}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none input-glow"
              >
                <option value="" className="bg-gray-900">Choose a student...</option>
                {students.map((s) => (
                  <option key={s.id} value={s.id} className="bg-gray-900">
                    {s.name} ({s.roll_number})
                  </option>
                ))}
              </select>
            </div>

            {/* Report Type */}
            <div className="mb-4">
              <label className="block text-sm text-gray-300 mb-1.5">{t('reports.reportType')}</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { value: 'student', label: t('reports.studentReport'), icon: HiOutlineAcademicCap },
                  { value: 'teacher', label: t('reports.teacherReport'), icon: HiOutlineUserGroup },
                  { value: 'parent', label: t('reports.parentReport'), icon: HiOutlineMail },
                ].map(({ value, label, icon: Icon }) => (
                  <button
                    key={value}
                    onClick={() => setReportType(value)}
                    className={`p-3 rounded-xl border text-xs text-center transition-all ${
                      reportType === value
                        ? 'border-purple-500/50 bg-purple-500/10 text-purple-400'
                        : 'border-white/10 text-gray-400 hover:bg-white/5'
                    }`}
                  >
                    <Icon className="mx-auto mb-1" size={18} />
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Language Select */}
            <div className="mb-6">
              <label className="block text-sm text-gray-300 mb-1.5 flex items-center gap-2">
                <HiOutlineTranslate className="text-cyan-400" />
                {t('reports.language')}
              </label>
              <select
                value={currentLanguage.code}
                onChange={(e) => changeLanguage(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none input-glow"
              >
                {languages.map((lang) => (
                  <option key={lang.code} value={lang.code} className="bg-gray-900">
                    {lang.native} ({lang.name})
                  </option>
                ))}
              </select>
            </div>

            {/* Generate Button */}
            <motion.button
              onClick={handleGenerate}
              disabled={generating || !selectedStudent}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-purple-600 to-cyan-600 text-white font-medium text-sm hover:shadow-lg hover:shadow-purple-500/25 transition-all disabled:opacity-50"
            >
              {generating ? (
                <span className="flex items-center justify-center gap-2">
                  <motion.div
                    className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                  />
                  {t('reports.generating')}
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  <HiOutlineSparkles size={16} />
                  {t('reports.generate')}
                </span>
              )}
            </motion.button>

            {error && (
              <p className="text-red-400 text-xs mt-2">{error}</p>
            )}
          </AnimatedCard>
        </div>

        {/* Report Output */}
        <div className="lg:col-span-2">
          {report ? (
            <AnimatedCard glow="green" className="min-h-[400px]">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                  <HiOutlineDocumentReport className="text-green-400" />
                  {t('reports.title')} ({reportType})
                </h2>
                {reportType === 'parent' && report.parent_whatsapp_message && (
                  <button
                    onClick={copyWhatsAppMessage}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-green-500/20 text-green-400 text-xs hover:bg-green-500/30 transition-all"
                  >
                    <HiOutlineChat size={14} />
                    {t('reports.copyWhatsApp')}
                  </button>
                )}
              </div>

              <div className="space-y-6">
                {report.report?.content?.summary && (
                  <div>
                    <h3 className="text-sm font-medium text-white mb-2">{t('reports.summary')}</h3>
                    <p className="text-sm text-gray-300 leading-relaxed">{report.report.content.summary}</p>
                  </div>
                )}

                {report.report?.content?.strengths?.length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium text-green-400 mb-2">{t('reports.strengths')}</h3>
                    <ul className="space-y-1">
                      {report.report.content.strengths.map((s, i) => (
                        <li key={i} className="text-sm text-gray-300 flex items-start gap-2">
                          <span className="text-green-400 mt-1">•</span> {s}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {report.report?.content?.weaknesses?.length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium text-red-400 mb-2">{t('reports.weaknesses')}</h3>
                    <ul className="space-y-1">
                      {report.report.content.weaknesses.map((w, i) => (
                        <li key={i} className="text-sm text-gray-300 flex items-start gap-2">
                          <span className="text-red-400 mt-1">•</span> {w}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {report.report?.content?.recommendations?.length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium text-purple-400 mb-2">{t('reports.recommendations')}</h3>
                    <ul className="space-y-1">
                      {report.report.content.recommendations.map((r, i) => (
                        <li key={i} className="text-sm text-gray-300 flex items-start gap-2">
                          <span className="text-purple-400 mt-1">•</span> {r}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {report.report?.content?.performance_score !== undefined && (
                  <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-gray-300">{t('reports.performanceScore')}</span>
                      <span className="text-lg font-bold text-white">{report.report.content.performance_score}/100</span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden">
                      <motion.div
                        className="h-full rounded-full bg-gradient-to-r from-purple-500 to-cyan-500"
                        initial={{ width: 0 }}
                        animate={{ width: `${report.report.content.performance_score}%` }}
                        transition={{ duration: 1, ease: 'easeOut' }}
                      />
                    </div>
                  </div>
                )}

                {/* WhatsApp Message Preview */}
                {reportType === 'parent' && report.parent_whatsapp_message && (
                  <div className="p-4 rounded-xl bg-green-500/5 border border-green-500/20">
                    <h3 className="text-sm font-medium text-green-400 mb-3 flex items-center gap-2">
                      <HiOutlineChat size={16} />
                      WhatsApp Message Preview
                    </h3>
                    <pre className="text-sm text-gray-300 whitespace-pre-wrap font-sans">
                      {report.parent_whatsapp_message}
                    </pre>
                  </div>
                )}
              </div>
            </AnimatedCard>
          ) : (
            <AnimatedCard className="min-h-[400px] flex items-center justify-center">
              <div className="text-center">
                <HiOutlineDocumentReport className="mx-auto text-gray-600 mb-4" size={48} />
                <p className="text-gray-400">Select a student and generate a report</p>
                <p className="text-gray-500 text-xs mt-1">
                  Reports support {languages.length} languages with AI-powered insights
                </p>
              </div>
            </AnimatedCard>
          )}
        </div>
      </div>
    </div>
  );
}
