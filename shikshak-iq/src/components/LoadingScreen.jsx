import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';

export default function LoadingScreen({ message }) {
  const { t } = useTranslation();
  const displayMessage = message || t('common.loading');
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0a0a0f]">
      <div className="text-center">
        {/* 3D AI Orb */}
        <div className="relative w-24 h-24 mx-auto mb-8">
          <motion.div
            className="absolute inset-0 rounded-full bg-gradient-to-r from-purple-500 via-cyan-500 to-pink-500"
            animate={{
              scale: [1, 1.1, 1],
              rotate: [0, 180, 360],
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              ease: 'linear',
            }}
            style={{ filter: 'blur(8px)' }}
          />
          <motion.div
            className="absolute inset-2 rounded-full bg-[#0a0a0f] flex items-center justify-center"
            animate={{ scale: [1, 0.95, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <span className="text-2xl font-bold text-gradient">IQ</span>
          </motion.div>
          {/* Orbiting rings */}
          <motion.div
            className="absolute -inset-4 rounded-full border border-purple-500/30"
            animate={{ rotate: 360 }}
            transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
          />
          <motion.div
            className="absolute -inset-8 rounded-full border border-cyan-500/20"
            animate={{ rotate: -360 }}
            transition={{ duration: 6, repeat: Infinity, ease: 'linear' }}
          />
        </div>

        {/* Loading text */}
        <motion.p
          className="text-gray-400 text-sm"
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          {displayMessage}
        </motion.p>

        {/* Progress dots */}
        <div className="flex justify-center gap-2 mt-4">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="w-2 h-2 rounded-full bg-purple-500"
              animate={{
                scale: [1, 1.5, 1],
                opacity: [0.5, 1, 0.5],
              }}
              transition={{
                duration: 1,
                repeat: Infinity,
                delay: i * 0.2,
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export function PageLoader() {
  const { t } = useTranslation();
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="text-center">
        <motion.div
          className="w-16 h-16 mx-auto mb-4 rounded-full border-2 border-purple-500/30 border-t-purple-500"
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
        />
        <p className="text-gray-400 text-sm">{t('common.loading')}</p>
      </div>
    </div>
  );
}
