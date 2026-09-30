import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import AnimatedCard from '../components/AnimatedCard';
import { PageLoader } from '../components/LoadingScreen';
import { bktAPI, remediationAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import useRealtime from '../services/useRealtime';
import {
  HiOutlineViewGrid,
  HiOutlineChartBar,
  HiOutlineLightBulb,
  HiOutlineExclamation,
  HiOutlineSearch,
  HiOutlineRefresh,
  HiOutlineSortDescending,
  HiOutlineInformationCircle,
  HiOutlineUserGroup,
  HiOutlineAcademicCap,
  HiOutlineTrendingUp,
  HiOutlineChevronDown,
  HiOutlineChevronRight,
  HiOutlineSparkles,
  HiOutlineClipboardCheck,
} from 'react-icons/hi';

// Color scale for mastery levels
const getMasteryColor = (val) => {
  if (val >= 0.8) return 'bg-green-500';
  if (val >= 0.7) return 'bg-green-400';
  if (val >= 0.6) return 'bg-emerald-400';
  if (val >= 0.5) return 'bg-yellow-400';
  if (val >= 0.4) return 'bg-yellow-500';
  if (val >= 0.3) return 'bg-orange-500';
  if (val >= 0.2) return 'bg-red-400';
  return 'bg-red-500';
};

const getMasteryBg = (val) => {
  if (val >= 0.8) return 'bg-green-500/90';
  if (val >= 0.7) return 'bg-green-400/80';
  if (val >= 0.6) return 'bg-emerald-400/70';
  if (val >= 0.5) return 'bg-yellow-400/70';
  if (val >= 0.4) return 'bg-yellow-500/60';
  if (val >= 0.3) return 'bg-orange-500/60';
  if (val >= 0.2) return 'bg-red-400/60';
  return 'bg-red-500/70';
};

const getMasteryTextColor = (val) => {
  if (val >= 0.5) return 'text-gray-900';
  return 'text-white';
};

const getMasteryLabel = (val) => {
  if (val >= 0.8) return 'Strong';
  if (val >= 0.6) return 'Developing';
  if (val >= 0.4) return 'Emerging';
  if (val >= 0.2) return 'Struggling';
  return 'Gap';
};

const getSeverityColor = (severity) => {
  switch (severity) {
    case 'critical': return 'text-red-400 bg-red-500/20 border-red-500/30';
    case 'high': return 'text-orange-400 bg-orange-500/20 border-orange-500/30';
    case 'medium': return 'text-yellow-400 bg-yellow-500/20 border-yellow-500/30';
    default: return 'text-green-400 bg-green-500/20 border-green-500/30';
  }
};

const getSeverityIcon = (severity) => {
  switch (severity) {
    case 'critical': return HiOutlineExclamation;
    case 'high': return HiOutlineExclamation;
    case 'medium': return HiOutlineInformationCircle;
    default: return HiOutlineTrendingUp;
  }
};

export default function LearningGaps() {
  const { t } = useTranslation();
  const { activeWorkspace } = useAuth();
  const [view, setView] = useState('heatmap');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('mastery');
  const [expandedStudent, setExpandedStudent] = useState(null);
  const [hoveredCell, setHoveredCell] = useState(null);

  const {
    data,
    loading,
    refresh,
    isLive,
    lastUpdated,
  } = useRealtime(
    async () => {
      if (!activeWorkspace?.assignment_id) return null;
      const res = await bktAPI.getMasteryMap({ assignment_id: activeWorkspace.assignment_id });
      return res.data;
    },
    {
      interval: 30_000,
      deps: [activeWorkspace?.assignment_id],
      enabled: !!activeWorkspace?.assignment_id,
    }
  );

  const filteredStudents = useMemo(() => {
    if (!data?.mastery_map) return [];
    let list = [...data.mastery_map];
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(s => s.student_name.toLowerCase().includes(q));
    }
    if (sortBy === 'name') {
      list.sort((a, b) => a.student_name.localeCompare(b.student_name));
    }
    return list;
  }, [data, searchQuery, sortBy]);

  const concepts = data?.concepts || [];
  const gapSummary = data?.gap_summary || [];
  const classAverages = data?.class_averages || {};

  if (!data) return <PageLoader />;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-3 mb-2">
              <HiOutlineViewGrid className="text-purple-400" />
              {t('learningGaps.title')}
            </h1>
            <p className="text-gray-400 text-sm">
              {t('learningGaps.description')}
            </p>
          </div>

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
            >
              <HiOutlineRefresh size={16} className={loading ? 'animate-spin' : ''} />
            </motion.button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4 mt-4">
          <div className="flex rounded-xl border border-white/10 p-1">
            <button
              onClick={() => setView('heatmap')}
              className={`px-4 py-2 rounded-lg text-sm transition-all flex items-center gap-2 ${
                view === 'heatmap' ? 'bg-purple-500/20 text-purple-400' : 'text-gray-400 hover:text-white'
              }`}
            >
              <HiOutlineViewGrid size={16} />
              {t('learningGaps.heatmap')}
            </button>
            <button
              onClick={() => setView('summary')}
              className={`px-4 py-2 rounded-lg text-sm transition-all flex items-center gap-2 ${
                view === 'summary' ? 'bg-purple-500/20 text-purple-400' : 'text-gray-400 hover:text-white'
              }`}
            >
              <HiOutlineChartBar size={16} />
              {t('learningGaps.summary')}
            </button>
          </div>

          {view === 'heatmap' && (
            <>
              <div className="relative flex-1 max-w-xs">
                <HiOutlineSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
                <input
                  type="text"
                  placeholder={t('learningGaps.searchStudents')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-lg pl-10 pr-4 py-2 text-white text-sm focus:outline-none input-glow placeholder-gray-600"
                />
              </div>

              <div className="flex items-center gap-2">
                <HiOutlineSortDescending className="text-gray-500" size={16} />
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none input-glow"
                >
                  <option value="mastery" className="bg-gray-900">{t('learningGaps.sortMastery')}</option>
                  <option value="name" className="bg-gray-900">{t('learningGaps.sortName')}</option>
                </select>
              </div>
            </>
          )}
        </div>
      </motion.div>

      {!data || !concepts.length ? (
        <AnimatedCard className="flex items-center justify-center min-h-[300px]">
          <div className="text-center">
            <HiOutlineViewGrid className="mx-auto text-gray-600 mb-4" size={48} />
            <p className="text-gray-400">{t('learningGaps.noData')}</p>
            <p className="text-gray-500 text-xs mt-1">
              {t('learningGaps.noDataHint')}
            </p>
          </div>
        </AnimatedCard>
      ) : view === 'heatmap' ? (
        <HeatmapView
          students={filteredStudents}
          concepts={concepts}
          classAverages={classAverages}
          hoveredCell={hoveredCell}
          setHoveredCell={setHoveredCell}
          expandedStudent={expandedStudent}
          setExpandedStudent={setExpandedStudent}
          t={t}
        />
      ) : (
        <SummaryView gapSummary={gapSummary} students={data.mastery_map} concepts={concepts} classAverages={classAverages} t={t} />
      )}
    </div>
  );
}

function HeatmapView({ students, concepts, classAverages, hoveredCell, setHoveredCell, expandedStudent, setExpandedStudent, t }) {
  const [genStudentId, setGenStudentId] = useState(null);
  const [genResults, setGenResults] = useState({});

  const cellWidth = Math.max(80, Math.min(160, 960 / concepts.length));
  const studentNameWidth = 180;
  const isSmall = concepts.length > 10;

  const masteryScaleItems = [
    { label: t('learningGaps.scaleGap'), color: 'bg-red-500' },
    { label: t('learningGaps.scaleStruggling'), color: 'bg-orange-500' },
    { label: t('learningGaps.scaleEmerging'), color: 'bg-yellow-500' },
    { label: t('learningGaps.scaleDeveloping'), color: 'bg-green-400' },
    { label: t('learningGaps.scaleStrong'), color: 'bg-green-500' },
  ];

  const classAvgOverall = Math.round(
    concepts.reduce((s, c) => s + (classAverages[c] || 0), 0) / Math.max(concepts.length, 1) * 100
  );

  return (
    <div>
      <AnimatedCard glow="purple" className="mb-4">
        <div className="flex items-center flex-wrap gap-6">
          <span className="text-xs text-gray-400 font-medium uppercase tracking-wider">{t('learningGaps.masteryScale')}:</span>
          {masteryScaleItems.map((item) => (
            <div key={item.label} className="flex items-center gap-2">
              <div className={`w-4 h-4 rounded ${item.color}`} />
              <span className="text-xs text-gray-400">{item.label}</span>
            </div>
          ))}
        </div>
      </AnimatedCard>

      <AnimatedCard glow="purple" className="overflow-hidden">
        <div className="overflow-x-auto">
          <div style={{ minWidth: studentNameWidth + concepts.length * cellWidth + 60 }}>
            {/* Header Row */}
            <div className="flex border-b border-white/10">
              <div
                className="sticky left-0 bg-[#12121a] z-10 px-4 py-3 flex items-center"
                style={{ width: studentNameWidth, minWidth: studentNameWidth }}
              >
                <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">{t('learningGaps.studentHeader')}</span>
              </div>
              <div className="flex">
                {concepts.map((concept) => (
                  <div
                    key={concept}
                    className="px-2 py-3 text-center border-r border-white/5 last:border-r-0"
                    style={{ width: cellWidth, minWidth: cellWidth }}
                  >
                    <span className="text-xs text-gray-400 font-medium truncate block" title={concept}>
                      {concept.length > 12 && isSmall ? concept.slice(0, 10) + '..' : concept}
                    </span>
                  </div>
                ))}
                <div className="px-3 py-3 text-center border-l border-white/10" style={{ width: 90, minWidth: 90 }}>
                  <span className="text-xs text-gray-400 font-medium uppercase tracking-wider">{t('learningGaps.avgHeader')}</span>
                </div>
              </div>
            </div>

            {/* Student Rows */}
            <AnimatePresence>
              {students.map((student, idx) => (
                <motion.div
                  key={student.student_id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.02 }}
                >
                  <div className="flex border-b border-white/5 hover:bg-white/5 transition-colors group">
                    <div
                      className="sticky left-0 bg-[#12121a] group-hover:bg-white/5 transition-colors z-10 px-4 py-2.5 flex items-center gap-2 cursor-pointer"
                      style={{ width: studentNameWidth, minWidth: studentNameWidth }}
                      onClick={() => setExpandedStudent(expandedStudent === student.student_id ? null : student.student_id)}
                    >
                      <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center flex-shrink-0">
                        <span className="text-white font-bold text-xs">{student.student_name?.charAt(0)}</span>
                      </div>
                      <span className="text-sm text-white truncate">{student.student_name}</span>
                      <span className="ml-auto text-xs text-gray-500">
                        {Math.round(student.overall_mastery * 100)}%
                      </span>
                      {expandedStudent === student.student_id ? (
                        <HiOutlineChevronDown className="text-gray-500 flex-shrink-0" size={14} />
                      ) : (
                        <HiOutlineChevronRight className="text-gray-500 flex-shrink-0" size={14} />
                      )}
                    </div>
                    <div className="flex">
                      {concepts.map((concept) => {
                        const val = student.concepts[concept] || 0;
                        const isHovered = hoveredCell?.student_id === student.student_id && hoveredCell?.concept === concept;
                        return (
                          <div
                            key={concept}
                            className="px-1 py-1.5 border-r border-white/5 last:border-r-0 relative"
                            style={{ width: cellWidth, minWidth: cellWidth }}
                            onMouseEnter={() => setHoveredCell({ student_id: student.student_id, concept, value: val, student_name: student.student_name })}
                            onMouseLeave={() => setHoveredCell(null)}
                          >
                            <motion.div
                              className={`w-full h-10 rounded-lg flex items-center justify-center transition-all cursor-default ${getMasteryBg(val)} ${getMasteryTextColor(val)}`}
                              animate={{
                                scale: isHovered ? 1.15 : 1,
                                opacity: hoveredCell && !isHovered ? 0.5 : 1,
                              }}
                              whileHover={{ scale: 1.15 }}
                            >
                              <span className="text-xs font-bold">{Math.round(val * 100)}%</span>
                            </motion.div>
                            <AnimatePresence>
                              {isHovered && (
                                <motion.div
                                  initial={{ opacity: 0, y: 5 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  exit={{ opacity: 0, y: 5 }}
                                  className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-20 pointer-events-none"
                                >
                                  <div className="glass px-3 py-2 rounded-lg text-xs whitespace-nowrap">
                                    <p className="text-white font-medium">{student.student_name}</p>
                                    <p className="text-purple-400">{concept}</p>
                                    <p className="text-gray-300">{t('learningGaps.tooltipMastery')}: <span className="font-bold">{Math.round(val * 100)}%</span></p>
                                    <p className="text-gray-400">{getMasteryLabel(val)}</p>
                                    {classAverages[concept] !== undefined && (
                                      <p className="text-gray-500 mt-0.5">
                                        {t('learningGaps.tooltipClassAvg')}: {Math.round(classAverages[concept] * 100)}% |
                                        {t('learningGaps.tooltipGap')}: {Math.round((classAverages[concept] - val) * 100)}%
                                      </p>
                                    )}
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        );
                      })}
                      <div className="px-3 py-1.5 border-l border-white/10 flex items-center justify-center" style={{ width: 90, minWidth: 90 }}>
                        <div className={`w-full h-10 rounded-lg flex items-center justify-center ${getMasteryBg(student.overall_mastery)} ${getMasteryTextColor(student.overall_mastery)}`}>
                          <span className="text-xs font-bold">{Math.round(student.overall_mastery * 100)}%</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Expanded Student Detail */}
                  <AnimatePresence>
                    {expandedStudent === student.student_id && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden bg-purple-500/5 border-b border-purple-500/10"
                      >
                        <div className="p-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
                          {/* Weak concepts */}
                          <div>
                            <p className="text-xs text-red-400 font-medium mb-2 uppercase tracking-wider">{t('learningGaps.weakConcepts')}</p>
                            {concepts.filter(c => (student.concepts[c] || 0) < 0.4).length > 0 ? (
                              <div className="space-y-1">
                                {concepts.filter(c => (student.concepts[c] || 0) < 0.4).slice(0, 5).map(c => (
                                  <div key={c} className="flex items-center justify-between px-2 py-1 rounded bg-red-500/10 text-xs">
                                    <span className="text-gray-300">{c}</span>
                                    <span className="text-red-400">{Math.round((student.concepts[c] || 0) * 100)}%</span>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="text-xs text-gray-500">{t('learningGaps.noWeakConcepts')}</p>
                            )}
                          </div>

                          {/* Strong concepts */}
                          <div>
                            <p className="text-xs text-green-400 font-medium mb-2 uppercase tracking-wider">{t('learningGaps.strongConcepts')}</p>
                            {concepts.filter(c => (student.concepts[c] || 0) >= 0.7).length > 0 ? (
                              <div className="space-y-1">
                                {concepts.filter(c => (student.concepts[c] || 0) >= 0.7).slice(0, 5).map(c => (
                                  <div key={c} className="flex items-center justify-between px-2 py-1 rounded bg-green-500/10 text-xs">
                                    <span className="text-gray-300">{c}</span>
                                    <span className="text-green-400">{Math.round((student.concepts[c] || 0) * 100)}%</span>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="text-xs text-gray-500">{t('learningGaps.noStrongConcepts')}</p>
                            )}
                          </div>

                          {/* Quick stats */}
                          <div>
                            <p className="text-xs text-purple-400 font-medium mb-2 uppercase tracking-wider">{t('learningGaps.overallStats')}</p>
                            <div className="space-y-2">
                              <div className="flex justify-between text-xs px-2 py-1 rounded bg-white/5">
                                <span className="text-gray-400">{t('learningGaps.overallMastery')}</span>
                                <span className="text-white font-medium">{Math.round(student.overall_mastery * 100)}%</span>
                              </div>
                              <div className="flex justify-between text-xs px-2 py-1 rounded bg-white/5">
                                <span className="text-gray-400">{t('learningGaps.conceptsBelow')}</span>
                                <span className="text-red-400 font-medium">{concepts.filter(c => (student.concepts[c] || 0) < 0.4).length}</span>
                              </div>
                              <div className="flex justify-between text-xs px-2 py-1 rounded bg-white/5">
                                <span className="text-gray-400">{t('learningGaps.conceptsAbove')}</span>
                                <span className="text-green-400 font-medium">{concepts.filter(c => (student.concepts[c] || 0) >= 0.7).length}</span>
                              </div>
                            </div>

                            {/* Student-level practice generation */}
                            {genResults[student.student_id] && (
                              <div className={`mt-2 p-2 rounded text-xs ${
                                genResults[student.student_id].error
                                  ? 'bg-red-500/10 text-red-400'
                                  : 'bg-green-500/10 text-green-400'
                              }`}>
                                {genResults[student.student_id].error || genResults[student.student_id].message}
                              </div>
                            )}
                            <motion.button
                              onClick={async () => {
                                setGenStudentId(student.student_id);
                                try {
                                  const res = await remediationAPI.generateForStudent(student.student_id);
                                  setGenResults(prev => ({ ...prev, [student.student_id]: res.data }));
                                } catch (err) {
                                  setGenResults(prev => ({ ...prev, [student.student_id]: { error: 'Failed to generate' } }));
                                }
                                setGenStudentId(null);
                              }}
                              disabled={genStudentId === student.student_id}
                              className="mt-2 w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-purple-600 to-cyan-600 text-white text-[10px] font-medium hover:shadow-lg transition-all disabled:opacity-50"
                            >
                              {genStudentId === student.student_id ? (
                                <><motion.div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full" animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }} /> Generating...</>
                              ) : (
                                <><HiOutlineSparkles size={12} /> Generate Practice</>
                              )}
                            </motion.button>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              ))}
            </AnimatePresence>

            {/* Class Average Row */}
            <div className="flex border-t-2 border-purple-500/30 bg-purple-500/5">
              <div
                className="sticky left-0 bg-[#12121a] z-10 px-4 py-3 flex items-center gap-2"
                style={{ width: studentNameWidth, minWidth: studentNameWidth }}
              >
                <HiOutlineUserGroup className="text-purple-400" size={16} />
                <span className="text-sm font-semibold text-purple-400">{t('learningGaps.classAverage')}</span>
              </div>
              <div className="flex">
                {concepts.map((concept) => {
                  const avg = classAverages[concept] || 0;
                  return (
                    <div key={concept} className="px-1 py-2 border-r border-white/5 last:border-r-0" style={{ width: cellWidth, minWidth: cellWidth }}>
                      <div className={`w-full h-8 rounded-lg flex items-center justify-center ${getMasteryBg(avg)} ${getMasteryTextColor(avg)}`}>
                        <span className="text-xs font-bold">{Math.round(avg * 100)}%</span>
                      </div>
                    </div>
                  );
                })}
                <div className="px-3 py-2 border-l border-purple-500/20 flex items-center justify-center" style={{ width: 90, minWidth: 90 }}>
                  <div className="w-full h-8 rounded-lg flex items-center justify-center bg-purple-500/40 text-purple-300">
                    <span className="text-xs font-bold">{classAvgOverall}%</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between mt-4 pt-4 border-t border-white/10 text-xs text-gray-500">
          <span>{t('learningGaps.footerStats', { students: students.length, concepts: concepts.length })}</span>
          <span>{t('learningGaps.footerHint')}</span>
        </div>
      </AnimatedCard>
    </div>
  );
}

function SummaryView({ gapSummary, students, concepts, classAverages, t }) {
  const { activeWorkspace } = useAuth();
  const [generating, setGenerating] = useState(false);
  const [genResult, setGenResult] = useState(null);

  const classAvgOverall = Math.round(
    concepts.reduce((s, c) => s + (classAverages[c] || 0), 0) / Math.max(concepts.length, 1) * 100
  );
  const criticalGaps = gapSummary.filter(g => g.severity === 'critical');
  const interventionGaps = gapSummary.filter(g => g.severity === 'critical' || g.severity === 'high');

  const handleGenerateRemediation = async () => {
    if (!activeWorkspace?.assignment_id) return;
    setGenerating(true);
    setGenResult(null);
    try {
      const res = await remediationAPI.generateForClass(activeWorkspace.assignment_id);
      setGenResult(res.data);
    } catch (err) {
      setGenResult({ error: err.response?.data?.error || 'Failed to generate' });
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <AnimatedCard glow="purple" delay={0}>
          <p className="text-gray-400 text-xs mb-1">{t('learningGaps.totalStudents')}</p>
          <p className="text-2xl font-bold text-white">{students?.length || 0}</p>
        </AnimatedCard>
        <AnimatedCard glow="cyan" delay={0.1}>
          <p className="text-gray-400 text-xs mb-1">{t('learningGaps.conceptsTracked')}</p>
          <p className="text-2xl font-bold text-white">{concepts?.length || 0}</p>
        </AnimatedCard>
        <AnimatedCard glow="pink" delay={0.2}>
          <p className="text-gray-400 text-xs mb-1">{t('learningGaps.classAvgMastery')}</p>
          <p className="text-2xl font-bold text-white">{classAvgOverall}%</p>
        </AnimatedCard>
      </div>

      {criticalGaps.length > 0 && (
        <AnimatedCard glow="pink" className="mb-6 border-red-500/30">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-lg bg-red-500/20">
              <HiOutlineExclamation className="text-red-400" size={20} />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">{t('learningGaps.criticalGapsTitle')}</h2>
              <p className="text-sm text-gray-400">{t('learningGaps.criticalGapsDesc', { count: criticalGaps.length })}</p>
            </div>
          </div>
        </AnimatedCard>
      )}

      <AnimatedCard glow="purple">
        <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <HiOutlineLightBulb className="text-purple-400" />
          {t('learningGaps.gapAnalysisTitle')}
        </h2>

        {gapSummary.length === 0 ? (
          <p className="text-gray-500 text-sm text-center py-8">{t('learningGaps.noGapData')}</p>
        ) : (
          <div className="space-y-3">
            {gapSummary.map((gap, idx) => {
              const SeverityIcon = getSeverityIcon(gap.severity);
              return (
                <motion.div
                  key={gap.concept}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className={`p-4 rounded-xl border ${getSeverityColor(gap.severity).split(' ').slice(1).join(' ')} bg-white/5`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <SeverityIcon size={16} className={getSeverityColor(gap.severity).split(' ')[0]} />
                        <h3 className="text-sm font-semibold text-white">{gap.concept}</h3>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium uppercase ${getSeverityColor(gap.severity)}`}>
                          {gap.severity}
                        </span>
                      </div>

                      <div className="flex items-center gap-3 mb-1">
                        <div className="flex-1 h-3 rounded-full bg-white/10 overflow-hidden">
                          <motion.div
                            className={`h-full rounded-full ${
                              gap.avg_mastery >= 0.7 ? 'bg-gradient-to-r from-green-500 to-emerald-500' :
                              gap.avg_mastery >= 0.4 ? 'bg-gradient-to-r from-yellow-500 to-orange-500' :
                              'bg-gradient-to-r from-red-500 to-pink-500'
                            }`}
                            initial={{ width: 0 }}
                            animate={{ width: `${Math.round(gap.avg_mastery * 100)}%` }}
                            transition={{ duration: 1, delay: idx * 0.1 }}
                          />
                        </div>
                        <span className="text-sm font-bold text-white w-12 text-right">{Math.round(gap.avg_mastery * 100)}%</span>
                      </div>

                      <div className="flex items-center gap-4 mt-2">
                        <span className="text-xs text-gray-400">
                          <span className="text-red-400 font-medium">{gap.struggling_students}</span>/{gap.total_students} {t('learningGaps.studentsStruggling')}
                        </span>
                        <span className="text-xs text-gray-500">
                          {gap.struggling_percentage}% {t('learningGaps.ofClass')}
                        </span>
                        {gap.severity !== 'low' && (
                          <span className="text-xs text-purple-400">
                            {t('learningGaps.needsRemediation')}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </AnimatedCard>

      {interventionGaps.length > 0 && (
        <AnimatedCard glow="green" className="mt-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <HiOutlineAcademicCap className="text-green-400" />
              {t('learningGaps.interventionsTitle')}
            </h2>
            <motion.button
              onClick={handleGenerateRemediation}
              disabled={generating}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-cyan-600 text-white text-xs font-medium hover:shadow-lg hover:shadow-purple-500/25 transition-all disabled:opacity-50"
            >
              {generating ? (
                <>
                  <motion.div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full" animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }} />
                  Generating...
                </>
              ) : (
                <><HiOutlineSparkles size={16} /> Auto-Generate Practice Quizzes</>
              )}
            </motion.button>
          </div>

          {/* Generation result message */}
          {genResult && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`mb-4 p-3 rounded-lg text-sm ${
                genResult.error
                  ? 'bg-red-500/10 border border-red-500/20 text-red-400'
                  : 'bg-green-500/10 border border-green-500/20 text-green-400'
              }`}
            >
              {genResult.error || genResult.message}
            </motion.div>
          )}

          <div className="space-y-3">
            {interventionGaps.slice(0, 5).map((gap) => (
              <div key={gap.concept} className="p-3 rounded-lg bg-green-500/5 border border-green-500/10">
                <p className="text-sm text-white font-medium mb-1">{gap.concept}</p>
                <p className="text-xs text-gray-400">
                  {gap.struggling_percentage >= 50
                    ? t('learningGaps.interventionReteach', { pct: gap.struggling_percentage })
                    : gap.struggling_percentage >= 30
                    ? t('learningGaps.interventionSmallGroup', { count: gap.struggling_students })
                    : t('learningGaps.interventionTutoring', { count: gap.struggling_students })
                  }
                </p>
              </div>
            ))}
          </div>
        </AnimatedCard>
      )}
    </div>
  );
}
