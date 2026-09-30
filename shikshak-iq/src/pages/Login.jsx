import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import NeuralBackground from '../components/NeuralBackground';
import { HiOutlineAcademicCap, HiOutlineUserGroup } from 'react-icons/hi';

export default function Login() {
  const [mounted, setMounted] = useState(false);
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    setMounted(true);
    // Redirect logged-in users away from the portal selection page
    if (user) {
      if (user.role === 'principal') {
        navigate('/admin');
      } else {
        navigate('/dashboard');
      }
    }
  }, [user, navigate]);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1, delayChildren: 0.3 },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
  };

  return (
    <div className="relative min-h-screen overflow-hidden">
      <NeuralBackground />

      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#0a0a0f]/50 to-[#0a0a0f] z-[1]" />

      <div className="relative z-10 min-h-screen flex items-center justify-center p-4">
        <AnimatePresence>
          {mounted && (
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              className="w-full max-w-md"
            >
              <motion.div variants={itemVariants} className="text-center mb-8">
                <motion.div
                  className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-purple-500 to-cyan-500 mb-4"
                  animate={{ scale: [1, 1.05, 1] }}
                  transition={{ duration: 3, repeat: Infinity }}
                >
                  <span className="text-3xl font-bold text-white">IQ</span>
                </motion.div>
                <h1 className="text-3xl font-bold text-white mb-2">
                  Shikshak<span className="text-purple-400">IQ</span>
                </h1>
                <p className="text-gray-400 text-sm">
                  AI-Powered Educational Intelligence Platform
                </p>
              </motion.div>

  

              {/* Portal Selection */}
              <motion.div variants={itemVariants} className="mt-6 glass rounded-2xl p-6 text-center">
                <p className="text-gray-400 text-sm mb-3">
                  {t('loginRedirect.description', 'This page has moved. Choose your portal:')}
                </p>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                  <motion.button
                    onClick={() => navigate('/teacher-portal')}
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    className="inline-flex items-center gap-2 py-3 px-6 rounded-xl bg-gradient-to-r from-purple-600 to-cyan-600 text-white text-sm font-medium hover:shadow-lg hover:shadow-purple-500/25 transition-all"
                  >
                    <HiOutlineAcademicCap size={18} />
                    Teacher Portal
                  </motion.button>
                  <motion.button
                    onClick={() => navigate('/student-portal')}
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    className="inline-flex items-center gap-2 py-3 px-6 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-sm font-medium hover:shadow-lg hover:shadow-emerald-500/25 transition-all"
                  >
                    <HiOutlineUserGroup size={18} />
                    Student Portal
                  </motion.button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
