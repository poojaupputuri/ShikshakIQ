import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { bktAPI } from '../services/api';
import useRealtime from '../services/useRealtime';
import {
  HiOutlineExclamation,
  HiOutlineX,
  HiOutlineAcademicCap,
  HiOutlineChevronDown,
  HiOutlineChevronRight,
  HiOutlineRefresh,
} from 'react-icons/hi';

const alertLevelConfig = {
  critical: {
    icon: HiOutlineExclamation,
    bg: 'bg-red-500/10',
    border: 'border-red-500/30',
    text: 'text-red-400',
    badge: 'bg-red-500/20 text-red-400',
    glow: 'shadow-[0_0_20px_rgba(239,68,68,0.15)]',
  },
  high: {
    icon: HiOutlineExclamation,
    bg: 'bg-orange-500/10',
    border: 'border-orange-500/30',
    text: 'text-orange-400',
    badge: 'bg-orange-500/20 text-orange-400',
    glow: 'shadow-[0_0_20px_rgba(249,115,22,0.15)]',
  },
  medium: {
    icon: HiOutlineAcademicCap,
    bg: 'bg-yellow-500/10',
    border: 'border-yellow-500/30',
    text: 'text-yellow-400',
    badge: 'bg-yellow-500/20 text-yellow-400',
    glow: 'shadow-[0_0_20px_rgba(234,179,8,0.15)]',
  },
};

export default function EarlyWarningAlerts({ assignmentId }) {
  const { t } = useTranslation();
  const [expandedAlert, setExpandedAlert] = useState(null);
  const [dismissedIds, setDismissedIds] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('shikshak_iq_dismissed_alerts') || '[]');
    } catch { return []; }
  });

  // Poll every 60 seconds — scoped to the active workspace
  const { data, loading, refresh, isLive, lastUpdated } = useRealtime(
    async () => {
      if (!assignmentId) return null;
      const res = await bktAPI.getEarlyWarnings({ assignment_id: assignmentId });
      return res.data;
    },
    { interval: 60_000, deps: [assignmentId], enabled: !!assignmentId }
  );

  const dismissAlert = useCallback((studentId) => {
    const updated = [...dismissedIds, studentId];
    setDismissedIds(updated);
    localStorage.setItem('shikshak_iq_dismissed_alerts', JSON.stringify(updated));
  }, [dismissedIds]);

  const dismissAll = useCallback(() => {
    const ids = (data?.alerts || []).map(a => a.student_id);
    setDismissedIds(ids);
    localStorage.setItem('shikshak_iq_dismissed_alerts', JSON.stringify(ids));
  }, [data]);

  const activeAlerts = (data?.alerts || []).filter(a => !dismissedIds.includes(a.student_id));
  const criticalCount = activeAlerts.filter(a => a.alert_level === 'critical').length;
  const highCount = activeAlerts.filter(a => a.alert_level === 'high').length;

  if (loading && !data) return null;
  if (activeAlerts.length === 0) return null;

  return (
    <div className="mb-6">
      {/* Header bar */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <h2 className="text-sm font-medium text-gray-400 uppercase tracking-wider flex items-center gap-2">
            <HiOutlineExclamation className="text-red-400" size={16} />
            {t('earlyWarnings.title')}
          </h2>
          {criticalCount > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 text-xs font-medium animate-pulse">
              {criticalCount} {t('earlyWarnings.critical')}
            </span>
          )}
          {highCount > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-400 text-xs font-medium">
              {highCount} {t('earlyWarnings.high')}
            </span>
          )}
          {isLive && (
            <span className="flex items-center gap-1 text-[10px] text-green-500">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
              Live
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <motion.button
            onClick={refresh}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            className="p-1.5 rounded-lg hover:bg-white/5 text-gray-500 hover:text-purple-400 transition-all"
          >
            <HiOutlineRefresh size={14} className={loading ? 'animate-spin' : ''} />
          </motion.button>
          <button
            onClick={dismissAll}
            className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
          >
            {t('earlyWarnings.dismissAll')}
          </button>
        </div>
      </div>

      {/* Alert Cards */}
      <div className="space-y-2">
        <AnimatePresence>
          {activeAlerts.slice(0, 5).map((alert) => {
            const config = alertLevelConfig[alert.alert_level] || alertLevelConfig.medium;
            const isExpanded = expandedAlert === alert.student_id;

            return (
              <motion.div
                key={alert.student_id}
                initial={{ opacity: 0, y: -10, height: 0 }}
                animate={{ opacity: 1, y: 0, height: 'auto' }}
                exit={{ opacity: 0, x: 100, height: 0 }}
                className={`rounded-xl border ${config.border} ${config.bg} ${config.glow} overflow-hidden`}
              >
                <div className="p-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3 flex-1">
                      <div className={`p-1.5 rounded-lg ${config.bg}`}>
                        <config.icon size={18} className={config.text} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Link
                            to={`/analytics?student=${alert.student_id}`}
                            className="text-sm font-medium text-white hover:text-purple-400 transition-colors"
                          >
                            {alert.student_name}
                          </Link>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium uppercase ${config.badge}`}>
                            {alert.alert_level}
                          </span>
                          <span className="text-xs text-gray-500">
                            {alert.class_name} • Roll: {alert.roll_number}
                          </span>
                        </div>

                        <div className="flex items-center gap-4 mt-1.5 text-xs">
                          <span className="text-gray-400">
                            {t('earlyWarnings.mastery')}: <span className="font-medium text-white">{Math.round(alert.avg_mastery * 100)}%</span>
                          </span>
                          {alert.recent_score !== null && (
                            <span className="text-gray-400">
                              {t('earlyWarnings.lastScore')}: <span className={`font-medium ${
                                alert.recent_score >= 60 ? 'text-green-400' :
                                alert.recent_score >= 35 ? 'text-yellow-400' : 'text-red-400'
                              }`}>{alert.recent_score}%</span>
                            </span>
                          )}
                          <span className={`font-medium ${config.text}`}>
                            {t('earlyWarnings.riskScore')}: {alert.risk_score}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        onClick={() => dismissAlert(alert.student_id)}
                        className="p-1 rounded hover:bg-white/5 text-gray-500 hover:text-white transition-all"
                        title={t('earlyWarnings.dismiss')}
                      >
                        <HiOutlineX size={14} />
                      </button>
                      <button
                        onClick={() => setExpandedAlert(isExpanded ? null : alert.student_id)}
                        className="p-1 rounded hover:bg-white/5 text-gray-500 hover:text-white transition-all"
                      >
                        {isExpanded ? <HiOutlineChevronDown size={14} /> : <HiOutlineChevronRight size={14} />}
                      </button>
                    </div>
                  </div>

                  {/* Expanded details */}
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="mt-3 pt-3 border-t border-white/10 space-y-2">
                          {/* Risk factors */}
                          {alert.factors?.length > 0 && (
                            <div>
                              <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">{t('earlyWarnings.riskFactors')}</p>
                              <ul className="space-y-1">
                                {alert.factors.map((factor, i) => (
                                  <li key={i} className="text-xs text-gray-400 flex items-start gap-2">
                                    <span className="text-red-400 mt-0.5">•</span>
                                    {factor}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {/* Weak concepts */}
                          {alert.weak_concepts?.length > 0 && (
                            <div>
                              <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">{t('earlyWarnings.weakConcepts')}</p>
                              <div className="flex flex-wrap gap-1.5">
                                {alert.weak_concepts.map((concept) => (
                                  <span
                                    key={concept}
                                    className="px-2 py-0.5 rounded bg-red-500/10 border border-red-500/20 text-[10px] text-red-300"
                                  >
                                    {concept}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Action link */}
                          <Link
                            to={`/analytics?student=${alert.student_id}`}
                            className="inline-flex items-center gap-1 text-xs text-purple-400 hover:text-purple-300 transition-colors"
                          >
                            {t('earlyWarnings.viewDetails')} <HiOutlineChevronRight size={12} />
                          </Link>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {activeAlerts.length > 5 && (
          <p className="text-xs text-gray-500 text-center pt-1">
            +{activeAlerts.length - 5} {t('earlyWarnings.moreAlerts')}
          </p>
        )}
      </div>
    </div>
  );
}
