import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import AnimatedCard from './AnimatedCard';
import { bktAPI } from '../services/api';
import {
  HiOutlineTrophy,
  HiOutlineUserGroup,
  HiOutlineChartBar,
  HiOutlineTrendingUp,
  HiOutlineTrendingDown,
  HiOutlineMinus,
  HiOutlineChevronRight,
  HiOutlineInformationCircle,
  HiOutlineExclamation,
} from 'react-icons/hi';

export default function PeerComparison({ studentId, studentName }) {
  const { t } = useTranslation();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (studentId) {
      fetchComparison();
    }
  }, [studentId]);

  const fetchComparison = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await bktAPI.getPeerComparison(studentId);
      setData(res.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load comparison data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <AnimatedCard glow="purple">
        <div className="animate-pulse space-y-4">
          <div className="h-6 w-48 bg-white/5 rounded-lg" />
          <div className="h-20 bg-white/5 rounded-xl" />
          <div className="h-4 w-full bg-white/5 rounded-lg" />
        </div>
      </AnimatedCard>
    );
  }

  if (error) {
    return (
      <AnimatedCard glow="pink" className="border-red-500/20">
        <div className="flex items-center gap-3 text-red-400">
          <HiOutlineExclamation size={20} />
          <p className="text-sm">{error}</p>
        </div>
      </AnimatedCard>
    );
  }

  if (!data) return null;

  const {
    rank,
    total_peers,
    percentile,
    student_mastery,
    class_mastery_avg,
    mastery_gap,
    class_score_avg,
    student_avg_score,
    score_gap,
    distribution,
    top_peers,
    mastery_trend,
  } = data;

  const TrendIcon = mastery_trend === 'above' ? HiOutlineTrendingUp : mastery_trend === 'below' ? HiOutlineTrendingDown : HiOutlineMinus;
  const trendColor = mastery_trend === 'above' ? 'text-green-400' : mastery_trend === 'below' ? 'text-red-400' : 'text-gray-400';
  const trendLabel = mastery_trend === 'above' ? t('peerComparison.aboveAverage') : mastery_trend === 'below' ? t('peerComparison.belowAverage') : t('peerComparison.onPar');

  const gapPercentage = Math.abs(mastery_gap * 100).toFixed(1);
  const gapLabel = mastery_gap >= 0
    ? t('peerComparison.aheadBy', { pct: gapPercentage })
    : t('peerComparison.behindBy', { pct: gapPercentage });

  // Distribution for the bar chart
  const totalDist = Object.values(distribution).reduce((a, b) => a + b, 0);

  return (
    <AnimatedCard glow="purple">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-white flex items-center gap-2">
          <HiOutlineUserGroup className="text-purple-400" />
          {t('peerComparison.title')}
        </h2>
        <span className="text-xs text-gray-500">{total_peers} {t('peerComparison.peers')}</span>
      </div>

      {/* Rank & Percentile */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="p-4 rounded-xl bg-gradient-to-br from-purple-500/20 to-cyan-500/10 border border-purple-500/20">
          <div className="flex items-center gap-2 mb-1">
            <HiOutlineTrophy className="text-yellow-400" size={18} />
            <span className="text-xs text-gray-400 uppercase tracking-wider">{t('peerComparison.classRank')}</span>
          </div>
          <p className="text-3xl font-bold text-white">
            {rank}<span className="text-lg text-gray-400 font-normal">/{total_peers}</span>
          </p>
          <p className="text-xs text-gray-500 mt-1">
            {rank === 1 ? t('peerComparison.topOfClass') : t('peerComparison.rankPosition', { rank })}
          </p>
        </div>

        <div className="p-4 rounded-xl bg-gradient-to-br from-cyan-500/20 to-purple-500/10 border border-cyan-500/20">
          <div className="flex items-center gap-2 mb-1">
            <HiOutlineChartBar className="text-cyan-400" size={18} />
            <span className="text-xs text-gray-400 uppercase tracking-wider">{t('peerComparison.percentile')}</span>
          </div>
          <p className="text-3xl font-bold text-white">{percentile}<span className="text-lg text-gray-400 font-normal">%</span></p>
          <p className="text-xs text-gray-500 mt-1">
            {percentile >= 90 ? t('peerComparison.topPerformer') : percentile >= 75 ? t('peerComparison.aboveAveragePerformer') : percentile >= 50 ? t('peerComparison.averagePerformer') : t('peerComparison.needsImprovement')}
          </p>
        </div>
      </div>

      {/* Mastery Comparison */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm text-gray-300">{t('peerComparison.masteryComparison')}</span>
          <div className={`flex items-center gap-1 text-xs font-medium ${trendColor}`}>
            <TrendIcon size={14} />
            {trendLabel}
          </div>
        </div>

        {/* Comparison bars */}
        <div className="space-y-3">
          <div>
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-purple-400 font-medium">{studentName}</span>
              <span className="text-white font-bold">{Math.round(student_mastery * 100)}%</span>
            </div>
            <div className="w-full h-3 rounded-full bg-white/10 overflow-hidden">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-purple-500 to-cyan-500"
                initial={{ width: 0 }}
                animate={{ width: `${Math.round(student_mastery * 100)}%` }}
                transition={{ duration: 1, ease: 'easeOut' }}
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-gray-400">{t('peerComparison.classAverage')}</span>
              <span className="text-gray-300 font-bold">{Math.round(class_mastery_avg * 100)}%</span>
            </div>
            <div className="w-full h-3 rounded-full bg-white/10 overflow-hidden">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-gray-400 to-gray-500"
                initial={{ width: 0 }}
                animate={{ width: `${Math.round(class_mastery_avg * 100)}%` }}
                transition={{ duration: 1, ease: 'easeOut', delay: 0.2 }}
              />
            </div>
          </div>
        </div>

        {/* Gap indicator */}
        <div className={`mt-3 flex items-center gap-2 px-3 py-2 rounded-lg text-xs ${
          mastery_gap >= 0 ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'
        }`}>
          <HiOutlineInformationCircle size={14} />
          {gapLabel}
        </div>
      </div>

      {/* Class Distribution */}
      <div className="mb-6">
        <h3 className="text-sm text-gray-300 mb-3">{t('peerComparison.classDistribution')}</h3>
        <div className="flex h-5 rounded-full overflow-hidden">
          {distribution.excellent > 0 && (
            <motion.div
              className="bg-green-500 flex items-center justify-center text-[10px] text-white font-medium"
              initial={{ width: 0 }}
              animate={{ width: `${(distribution.excellent / totalDist) * 100}%` }}
              transition={{ duration: 0.8, delay: 0.3 }}
              title={`Excellent: ${distribution.excellent}`}
            >
              {distribution.excellent}
            </motion.div>
          )}
          {distribution.good > 0 && (
            <motion.div
              className="bg-emerald-400 flex items-center justify-center text-[10px] text-white font-medium"
              initial={{ width: 0 }}
              animate={{ width: `${(distribution.good / totalDist) * 100}%` }}
              transition={{ duration: 0.8, delay: 0.4 }}
              title={`Good: ${distribution.good}`}
            >
              {distribution.good}
            </motion.div>
          )}
          {distribution.average > 0 && (
            <motion.div
              className="bg-yellow-400 flex items-center justify-center text-[10px] text-gray-900 font-medium"
              initial={{ width: 0 }}
              animate={{ width: `${(distribution.average / totalDist) * 100}%` }}
              transition={{ duration: 0.8, delay: 0.5 }}
              title={`Average: ${distribution.average}`}
            >
              {distribution.average}
            </motion.div>
          )}
          {distribution.below_average > 0 && (
            <motion.div
              className="bg-orange-500 flex items-center justify-center text-[10px] text-white font-medium"
              initial={{ width: 0 }}
              animate={{ width: `${(distribution.below_average / totalDist) * 100}%` }}
              transition={{ duration: 0.8, delay: 0.6 }}
              title={`Below Average: ${distribution.below_average}`}
            >
              {distribution.below_average}
            </motion.div>
          )}
          {distribution.struggling > 0 && (
            <motion.div
              className="bg-red-500 flex items-center justify-center text-[10px] text-white font-medium"
              initial={{ width: 0 }}
              animate={{ width: `${(distribution.struggling / totalDist) * 100}%` }}
              transition={{ duration: 0.8, delay: 0.7 }}
              title={`Struggling: ${distribution.struggling}`}
            >
              {distribution.struggling}
            </motion.div>
          )}
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-3 mt-2">
          {[
            { label: t('peerComparison.excellent'), color: 'bg-green-500' },
            { label: t('peerComparison.good'), color: 'bg-emerald-400' },
            { label: t('peerComparison.average'), color: 'bg-yellow-400' },
            { label: t('peerComparison.belowAverage'), color: 'bg-orange-500' },
            { label: t('peerComparison.struggling'), color: 'bg-red-500' },
          ].map((item) => (
            <div key={item.label} className="flex items-center gap-1.5">
              <div className={`w-2.5 h-2.5 rounded ${item.color}`} />
              <span className="text-[10px] text-gray-500">{item.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Top Performers */}
      {top_peers.length > 0 && (
        <div>
          <h3 className="text-sm text-gray-300 mb-3 flex items-center gap-2">
            <HiOutlineTrophy className="text-yellow-400" size={16} />
            {t('peerComparison.topPerformers')}
          </h3>
          <div className="space-y-2">
            {top_peers.map((peer, i) => (
              <div
                key={peer.name}
                className="flex items-center justify-between px-3 py-2 rounded-lg bg-white/5"
              >
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-bold w-5 ${i === 0 ? 'text-yellow-400' : i === 1 ? 'text-gray-300' : i === 2 ? 'text-orange-400' : 'text-gray-500'}`}>
                    #{i + 1}
                  </span>
                  <span className="text-sm text-gray-300">{peer.name}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-gray-500">{Math.round(peer.avg_score)}% avg</span>
                  <span className="text-xs font-medium text-purple-400">{Math.round(peer.mastery * 100)}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </AnimatedCard>
  );
}
