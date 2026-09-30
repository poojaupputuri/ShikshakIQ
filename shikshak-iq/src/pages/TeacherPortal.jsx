import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import NeuralBackground from '../components/NeuralBackground';
import {
  HiOutlineMail,
  HiOutlineLockClosed,
  HiOutlineEye,
  HiOutlineEyeOff,
  HiOutlineAcademicCap,
  HiOutlineUserGroup,
  HiOutlineChartBar,
  HiOutlineSparkles,
} from 'react-icons/hi';

export default function TeacherPortal() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [mounted, setMounted] = useState(false);
  const { t } = useTranslation();
  const { login, user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    setMounted(true);
    if (user) {
      if (user.role === 'principal') {
        navigate('/admin');
      } else {
        navigate('/dashboard');
      }
    }
  }, [user, navigate]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const userData = await login(email, password);
      if (userData.role === 'principal') {
        navigate('/admin');
      } else {
        navigate('/dashboard');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const fillCredentials = (userType) => {
    if (userType === 'principal') {
      setEmail('principal@shikshakiq.com');
      setPassword('Principal@123');
    } else if (userType === 'lakshmi') {
      setEmail('lakshmi@shikshakiq.com');
      setPassword('Teacher@123');
    } else if (userType === 'rajan') {
      setEmail('rajan@shikshakiq.com');
      setPassword('Teacher@123');
    }
  };

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

  // Redirect already-authenticated users
  if (user) return null;

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
              className="w-full max-w-4xl"
            >
              {/* Portal Selection Header */}
              <motion.div variants={itemVariants} className="text-center mb-8">
                <motion.div
                  className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-purple-500 to-cyan-500 mb-4"
                  animate={{ scale: [1, 1.05, 1] }}
                  transition={{ duration: 3, repeat: Infinity }}
                >
                  <HiOutlineAcademicCap className="text-white" size={36} />
                </motion.div>
                <h1 className="text-3xl font-bold text-white mb-2">
                  {t('teacherPortal.portal', 'Teacher Portal')}
                </h1>
                <p className="text-gray-400 text-sm">
                  {t('teacherPortal.portalDesc', 'Manage classes, create quizzes, and track student progress')}
                </p>
                <div className="flex items-center justify-center gap-4 mt-4">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-xs text-purple-400">
                    <HiOutlineSparkles size={12} />
                    {t('teacherPortal.aiPowered', 'AI-Powered')}
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-xs text-cyan-400">
                    <HiOutlineChartBar size={12} />
                    {t('teacherPortal.analytics', 'Advanced Analytics')}
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-green-500/10 border border-green-500/20 text-xs text-green-400">
                    <HiOutlineUserGroup size={12} />
                    {t('teacherPortal.multilingual', '11 Languages')}
                  </span>
                </div>
              </motion.div>

              <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                {/* Login Form */}
                <motion.form
                  variants={itemVariants}
                  onSubmit={handleLogin}
                  className="lg:col-span-3 glass rounded-2xl p-8 space-y-6"
                >
                  <div className="text-center">
                    <h2 className="text-xl font-semibold text-white">{t('auth.welcomeBack', 'Welcome Back')}</h2>
                    <p className="text-gray-400 text-sm mt-1">{t('auth.signInDesc', 'Sign in to your account')}</p>
                  </div>

                  <AnimatePresence>
                    {error && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-sm text-red-400"
                      >
                        {error}
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      {t('auth.email', 'Email Address')}
                    </label>
                    <div className="relative">
                      <HiOutlineMail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder={t('auth.emailPlaceholder', 'teacher@school.com')}
                        className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white placeholder-gray-500 focus:outline-none input-glow transition-all"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      {t('auth.password', 'Password')}
                    </label>
                    <div className="relative">
                      <HiOutlineLockClosed className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder={t('auth.passwordPlaceholder', 'Enter your password')}
                        className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-10 pr-12 text-white placeholder-gray-500 focus:outline-none input-glow transition-all"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
                      >
                        {showPassword ? <HiOutlineEyeOff size={18} /> : <HiOutlineEye size={18} />}
                      </button>
                    </div>
                  </div>

                  <motion.button
                    type="submit"
                    disabled={isLoading}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="w-full py-3 rounded-xl bg-gradient-to-r from-purple-600 to-cyan-600 text-white font-semibold text-sm hover:shadow-lg hover:shadow-purple-500/25 transition-all disabled:opacity-50"
                  >
                    {isLoading ? (
                      <span className="flex items-center justify-center gap-2">
                        <motion.div
                          className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full"
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                        />
                        {t('auth.signingIn', 'Signing in...')}
                      </span>
                    ) : (
                      <span className="flex items-center justify-center gap-2">
                        <HiOutlineAcademicCap size={16} />
                        {t('teacherPortal.enterPortal', 'Enter Teacher Portal')}
                      </span>
                    )}
                  </motion.button>

                  <div className="text-center pt-2">
                    <button
                      type="button"
                      onClick={() => navigate('/student-portal')}
                      className="text-xs text-gray-500 hover:text-purple-400 transition-colors"
                    >
                      {t('teacherPortal.switchToStudent', 'Switch to Student Portal →')}
                    </button>
                  </div>
                </motion.form>

                {/* Demo Credentials Sidebar */}
                <motion.div
                  variants={itemVariants}
                  className="lg:col-span-2 glass rounded-2xl p-6 border border-purple-500/20"
                >
                  <p className="text-center text-xs text-gray-500 mb-4 uppercase tracking-wider">
                    {t('auth.quickLogin', 'Quick Login — Demo Accounts')}
                  </p>

                  <div className="space-y-3">
                    {/* Principal */}
                    <motion.button
                      onClick={() => fillCredentials('principal')}
                      whileHover={{ scale: 1.03, y: -2 }}
                      whileTap={{ scale: 0.97 }}
                      className="w-full flex items-center gap-3 p-4 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/20 hover:border-purple-500/40 transition-all text-left"
                    >
                      <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center flex-shrink-0">
                        <HiOutlineUserGroup className="text-white" size={20} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-purple-300">Principal</p>
                        <p className="text-xs text-gray-500 truncate">principal@shikshakiq.com</p>
                      </div>
                      <span className="text-xs text-purple-400 bg-purple-500/10 px-2 py-1 rounded">Click</span>
                    </motion.button>

                    {/* Lakshmi - Maths Teacher */}
                    <motion.button
                      onClick={() => fillCredentials('lakshmi')}
                      whileHover={{ scale: 1.03, y: -2 }}
                      whileTap={{ scale: 0.97 }}
                      className="w-full flex items-center gap-3 p-4 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/20 hover:border-cyan-500/40 transition-all text-left"
                    >
                      <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-cyan-600 to-blue-600 flex items-center justify-center flex-shrink-0">
                        <HiOutlineAcademicCap className="text-white" size={20} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-cyan-300">Lakshmi (Maths)</p>
                        <p className="text-xs text-gray-500 truncate">lakshmi@shikshakiq.com</p>
                      </div>
                      <span className="text-xs text-cyan-400 bg-cyan-500/10 px-2 py-1 rounded">Click</span>
                    </motion.button>

                    {/* Rajan - Science Teacher */}
                    <motion.button
                      onClick={() => fillCredentials('rajan')}
                      whileHover={{ scale: 1.03, y: -2 }}
                      whileTap={{ scale: 0.97 }}
                      className="w-full flex items-center gap-3 p-4 rounded-xl bg-pink-500/10 hover:bg-pink-500/20 border border-pink-500/20 hover:border-pink-500/40 transition-all text-left"
                    >
                      <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-pink-600 to-rose-600 flex items-center justify-center flex-shrink-0">
                        <HiOutlineAcademicCap className="text-white" size={20} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-pink-300">Rajan (Science)</p>
                        <p className="text-xs text-gray-500 truncate">rajan@shikshakiq.com</p>
                      </div>
                      <span className="text-xs text-pink-400 bg-pink-500/10 px-2 py-1 rounded">Click</span>
                    </motion.button>
                  </div>

                  <div className="mt-4 pt-4 border-t border-white/5">
                    <p className="text-xs text-gray-600 text-center">
                      {t('teacherPortal.passwordHint', 'Password: Teacher@123 (Principal: Principal@123)')}
                    </p>
                  </div>
                </motion.div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
