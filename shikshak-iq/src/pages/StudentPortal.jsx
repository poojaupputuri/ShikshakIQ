import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { studentPortalAPI } from '../services/api';
import { HiOutlineUserCircle, HiOutlineAcademicCap, HiOutlineChartBar, HiOutlineLightBulb, HiOutlineTrendingUp, HiOutlineExclamation, HiOutlineChevronRight, HiOutlineSparkles, HiOutlineClipboardCheck, HiOutlineBookOpen, HiOutlineLogin, HiOutlineLockClosed, HiOutlineEye, HiOutlineEyeOff } from 'react-icons/hi';

const getMasteryColor = (val) => {
  if (val >= 0.8) return 'bg-green-500';
  if (val >= 0.6) return 'bg-yellow-500';
  if (val >= 0.4) return 'bg-orange-500';
  return 'bg-red-500';
};

const getScoreColor = (val) => {
  if (val >= 70) return 'text-green-400 bg-green-500/20';
  if (val >= 40) return 'text-yellow-400 bg-yellow-500/20';
  return 'text-red-400 bg-red-500/20';
};

export default function StudentPortal() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [view, setView] = useState('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [student, setStudent] = useState(null);
  const [profile, setProfile] = useState(null);
  const [progress, setProgress] = useState(null);
  const [remediation, setRemediation] = useState(null);
  const [activeQuiz, setActiveQuiz] = useState(null);
  const [quizAnswers, setQuizAnswers] = useState({});
  const [quizResult, setQuizResult] = useState(null);
  const [submittingQuiz, setSubmittingQuiz] = useState(false);
  const [generatingQuizzes, setGeneratingQuizzes] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('shikshak_iq_student_token');
    if (token) {
      (async () => {
        try {
          const res = await studentPortalAPI.getProfile();
          setProfile(res.data);
          setView('dashboard');
        } catch (err) {
          localStorage.removeItem('shikshak_iq_student_token');
          setView('login');
        }
      })();
    }
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    localStorage.removeItem('shikshak_iq_student_token');
    setProfile(null);
    setStudent(null);
    setProgress(null);
    setRemediation(null);
    try {
      const res = await studentPortalAPI.login(username, password);
      const { token, student: studentData } = res.data || {};
      if (!token) {
        throw new Error(t('studentPortal.invalidResponse', 'Invalid response from server. Please try again.'));
      }
      localStorage.setItem('shikshak_iq_student_token', token);
      if (studentData) setStudent(studentData);
      setView('dashboard');
      fetchProfile();
    } catch (err) {
      let errorMsg;
      if (err.response) {
        errorMsg = err.response.data?.error || 
                   (err.response.status === 401 ? t('studentPortal.invalidCreds', 'Invalid username or password') :
                    err.response.status === 403 ? t('studentPortal.deactivated', 'Account is deactivated') :
                    err.response.status === 404 ? t('studentPortal.notFound', 'Student account not found') :
                    t('studentPortal.serverError', 'Server error ({{status}})', { status: err.response.status }));
      } else if (err.request) {
        errorMsg = t('studentPortal.networkError', 'Unable to reach the server. Please check your connection and try again.');
      } else {
        errorMsg = err.message || t('studentPortal.unknownError', 'An unexpected error occurred');
      }
      setError(errorMsg);
      setView('login');
    } finally {
      setLoading(false);
    }
  };

  const fetchProfile = async () => {
    try {
      const res = await studentPortalAPI.getProfile();
      setProfile(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchProgress = async () => {
    try {
      setLoading(true);
      const res = await studentPortalAPI.getProgress();
      setProgress(res.data);
      setView('progress');
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchRemediation = async () => {
    try {
      setLoading(true);
      const res = await studentPortalAPI.getRemediationQuizzes();
      setRemediation(res.data || { remediation_quizzes: [] });
      setView('remediation');
    } catch (err) {
      console.error('Failed to fetch remediation quizzes:', err);
      alert(t('studentPortal.fetchError', 'Failed to load practice quizzes. Please try again.'));
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('shikshak_iq_student_token');
    setStudent(null);
    setProfile(null);
    setProgress(null);
    setRemediation(null);
    setView('login');
    setUsername('');
    setPassword('');
    setActiveQuiz(null);
    setQuizAnswers({});
    setQuizResult(null);
  };

  const handleStartQuiz = (remQuiz) => {
    setActiveQuiz(remQuiz);
    setQuizAnswers({});
    setQuizResult(null);
  };

  const handleAnswerChange = (questionId, answer) => {
    setQuizAnswers(prev => ({ ...prev, [questionId]: answer }));
  };

  const handleSubmitQuiz = async () => {
    if (!activeQuiz?.quiz_id) return;
    setSubmittingQuiz(true);
    try {
      const formattedAnswers = Object.entries(quizAnswers).map(([qId, answer]) => ({
        question_id: parseInt(qId),
        answer: answer || '',
      }));
      const res = await studentPortalAPI.submitQuiz(activeQuiz.quiz_id, {
        answers: formattedAnswers,
      });
      setQuizResult(res.data);
      fetchRemediation();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to submit quiz');
    } finally {
      setSubmittingQuiz(false);
    }
  };

  const handleGenerateRemediation = async () => {
    setGeneratingQuizzes(true);
    try {
      const res = await studentPortalAPI.generateRemediation();
      await fetchRemediation();
      if (res.data.generated === 0 && res.data.message) {
        alert(res.data.message);
      }
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to generate practice quizzes');
    } finally {
      setGeneratingQuizzes(false);
    }
  };

  const handleGoBackToPractice = () => {
    setActiveQuiz(null);
    setQuizAnswers({});
    setQuizResult(null);
    setView('remediation');
  };

  if (view === 'login') {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-purple-500 to-cyan-500 mb-4">
              <HiOutlineAcademicCap className="text-white" size={36} />
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">{t('studentPortal.portal', 'Student Portal')}</h1>
            <p className="text-gray-400 text-sm">{t('studentPortal.portalDesc', 'Track your learning progress and improve')}</p>
          </div>

          <form onSubmit={handleLogin} className="glass rounded-2xl p-8 space-y-6">
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
              <label className="block text-sm font-medium text-gray-300 mb-2">{t('auth.username', 'Username')}</label>
              <div className="relative">
                <HiOutlineUserCircle className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                <input
                  id="student-username"
                  name="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter your username (e.g., student.aarav)"
                  className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white placeholder-gray-500 focus:outline-none input-glow"
                  autoComplete="username"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">{t('auth.password', 'Password')}</label>
              <div className="relative">
                <HiOutlineLockClosed className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                <input
                  id="student-password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-10 pr-12 text-white placeholder-gray-500 focus:outline-none input-glow"
                  autoComplete="current-password"
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

            <button
              type="button"
              onClick={handleLogin}
              disabled={loading}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-purple-600 to-cyan-600 text-white font-semibold text-sm disabled:opacity-50 hover:scale-[1.02] active:scale-[0.98] transition-transform"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <motion.div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full" animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }} />
                  {t('auth.signingIn', 'Signing In...')}
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  <HiOutlineLogin size={16} />
                  {t('studentPortal.signIn', 'Sign In to Your Portal')}
                </span>
              )}
            </button>

            <div className="text-center">
              <p className="text-xs text-gray-500 mb-2">
                {t('studentPortal.demoCreds', 'Demo credentials: username = student.aarav, password = student123')}
              </p>
              <p className="text-xs text-gray-600">
                {t('studentPortal.otherAccounts', 'Other accounts: student.ananya, student.arjun, etc. (all use password: student123)')}
              </p>
            </div>
          </form>

          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={() => navigate('/teacher-portal')}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-purple-500/20 text-sm text-purple-400 hover:bg-purple-500/10 hover:border-purple-500/40 transition-all"
            >
              <HiOutlineAcademicCap size={16} />
              {t('studentPortal.switchToTeacher', 'Switch to Teacher Portal →')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (view === 'dashboard') {
    const stats = profile?.stats || {};
    const recentResults = profile?.recent_results || [];
    return (
      <div className="min-h-screen bg-[#0a0a0f]">
        <div className="glass sticky top-0 z-50">
          <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-purple-500 to-cyan-500 flex items-center justify-center">
                <HiOutlineAcademicCap className="text-white" size={20} />
              </div>
              <span className="text-white font-semibold">{t('studentPortal.myPortal', 'My Learning Portal')}</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-400">{profile?.student?.name}</span>
              <button onClick={() => window.location.href = '/teacher-portal'} className="text-xs text-purple-400 hover:text-purple-300 px-3 py-1.5 rounded-lg hover:bg-purple-500/10">
                {t('studentPortal.switchToTeacher', 'Switch to Teacher')}
              </button>
              <button onClick={handleLogout} className="text-xs text-red-400 hover:text-red-300 px-3 py-1.5 rounded-lg hover:bg-red-500/10">
                {t('nav.logout', 'Logout')}
              </button>
            </div>
          </div>
        </div>
        <div className="max-w-5xl mx-auto px-4 py-8">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
            <h1 className="text-2xl font-bold text-white mb-1">
              {t('studentPortal.hey', 'Hey, {{name}}! 👋', { name: profile?.student?.name?.split(' ')[0] || 'Student' })}
            </h1>
            <p className="text-gray-400">{profile?.student?.class_name} • {profile?.student?.roll_number}</p>
          </motion.div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
              className="glass rounded-xl p-4 border border-purple-500/20">
              <p className="text-xs text-gray-500 mb-1">{t('studentPortal.quizzesTaken', 'Quizzes Taken')}</p>
              <p className="text-2xl font-bold text-white">{stats.total_quizzes || 0}</p>
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
              className="glass rounded-xl p-4 border border-cyan-500/20">
              <p className="text-xs text-gray-500 mb-1">{t('studentPortal.averageScore', 'Average Score')}</p>
              <p className="text-2xl font-bold text-white">{stats.average_score || 0}%</p>
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
              className="glass rounded-xl p-4 border border-green-500/20">
              <p className="text-xs text-gray-500 mb-1">{t('studentPortal.strongConcepts', 'Strong Concepts')}</p>
              <p className="text-2xl font-bold text-green-400">{stats.strong_concepts_count || 0}</p>
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
              className="glass rounded-xl p-4 border border-red-500/20">
              <p className="text-xs text-gray-500 mb-1">{t('studentPortal.needPractice', 'Need Practice')}</p>
              <p className="text-2xl font-bold text-red-400">{stats.weak_concepts_count || 0}</p>
            </motion.div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
            <motion.button onClick={fetchProgress} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
              className="glass rounded-xl p-5 text-left border border-purple-500/20 hover:border-purple-500/40 transition-all group">
              <HiOutlineTrendingUp className="text-purple-400 mb-3 group-hover:scale-110 transition-transform" size={28} />
              <h3 className="text-white font-semibold mb-1">{t('studentPortal.myProgress', 'My Progress')}</h3>
              <p className="text-xs text-gray-500">{t('studentPortal.myProgressDesc', 'View detailed score timeline and growth')}</p>
            </motion.button>
            <motion.button onClick={() => { setView('concepts'); fetchProfile(); }} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
              className="glass rounded-xl p-5 text-left border border-cyan-500/20 hover:border-cyan-500/40 transition-all group">
              <HiOutlineLightBulb className="text-cyan-400 mb-3 group-hover:scale-110 transition-transform" size={28} />
              <h3 className="text-white font-semibold mb-1">{t('studentPortal.myGaps', 'My Gaps')}</h3>
              <p className="text-xs text-gray-500">{t('studentPortal.myGapsDesc', 'See concept strengths & weaknesses')}</p>
            </motion.button>
            <motion.button onClick={fetchRemediation} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
              className="glass rounded-xl p-5 text-left border border-green-500/20 hover:border-green-500/40 transition-all group">
              <HiOutlineClipboardCheck className="text-green-400 mb-3 group-hover:scale-110 transition-transform" size={28} />
              <h3 className="text-white font-semibold mb-1">{t('studentPortal.practiceQuizzes', 'Practice Quizzes')}</h3>
              <p className="text-xs text-gray-500">{t('studentPortal.practiceQuizzesDesc', 'Complete assigned remediation')}</p>
            </motion.button>
          </div>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
            className="glass rounded-xl p-6 border border-white/10">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <HiOutlineChartBar className="text-purple-400" />
              {t('studentPortal.recentResults', 'Recent Quiz Results')}
            </h2>
            {recentResults.length > 0 ? (
              <div className="space-y-3">
                {recentResults.map((r, i) => (
                  <div key={r.id || i} className="flex items-center justify-between p-3 rounded-xl bg-white/5">
                    <div className="flex-1">
                      <p className="text-sm text-white font-medium">{r.quiz_title}</p>
                      <p className="text-xs text-gray-500">{r.subject} • {new Date(r.submitted_at).toLocaleDateString()}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-gray-400">{r.score}/{r.total_marks}</span>
                      <span className={`px-2.5 py-1 rounded-lg text-xs font-medium ${getScoreColor(r.percentage)}`}>
                        {r.percentage}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500 text-sm">{t('studentPortal.noQuizzes', 'No quizzes taken yet.')}</div>
            )}
          </motion.div>
        </div>
      </div>
    );
  }

  if (view === 'progress' && progress) {
    return (
      <div className="min-h-screen bg-[#0a0a0f]">
        <div className="glass sticky top-0 z-50">
          <div className="max-w-5xl mx-auto px-4 py-3 flex items-center gap-4">
            <button onClick={() => setView('dashboard')} className="text-sm text-purple-400 hover:text-purple-300">&larr; {t('common.back', 'Back')}</button>
            <span className="text-white font-semibold">{t('studentPortal.myProgress', 'My Progress')}</span>
          </div>
        </div>
        <div className="max-w-5xl mx-auto px-4 py-8">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
            <div className="glass rounded-xl p-4 border border-purple-500/20">
              <p className="text-xs text-gray-500 mb-1">{t('studentPortal.quizzesTaken', 'Quizzes Taken')}</p>
              <p className="text-2xl font-bold text-white">{progress.total_quizzes}</p>
            </div>
            <div className="glass rounded-xl p-4 border border-cyan-500/20">
              <p className="text-xs text-gray-500 mb-1">{t('studentPortal.averageScore', 'Average Score')}</p>
              <p className="text-2xl font-bold text-white">{progress.current_average}%</p>
            </div>
            <div className="glass rounded-xl p-4 border border-green-500/20">
              <p className="text-xs text-gray-500 mb-1">Improvement Rate</p>
              <p className={`text-2xl font-bold ${progress.improvement_rate >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {progress.improvement_rate >= 0 ? '+' : ''}{progress.improvement_rate}%
              </p>
            </div>
            <div className="glass rounded-xl p-4 border border-pink-500/20">
              <p className="text-xs text-gray-500 mb-1">Subjects</p>
              <p className="text-2xl font-bold text-white">{progress.subject_breakdown?.length || 0}</p>
            </div>
          </div>
          {progress.timeline?.length > 0 && (
            <div className="glass rounded-xl p-6 border border-white/10 mb-6">
              <h2 className="text-lg font-semibold text-white mb-4">Score Timeline</h2>
              <div className="space-y-2">
                {progress.timeline.map((t, i) => (
                  <div key={i} className="flex items-center gap-4 p-3 rounded-xl bg-white/5">
                    <div className="w-20 flex-shrink-0">
                      <span className="text-xs text-gray-500">{t.date}</span>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm text-white font-medium">{t.quiz_title}</span>
                        <span className="text-xs text-gray-500">{t.subject}</span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden">
                        <motion.div
                          className="h-full rounded-full bg-gradient-to-r from-purple-500 to-cyan-500"
                          initial={{ width: 0 }}
                          animate={{ width: `${t.percentage}%` }}
                          transition={{ duration: 0.8, delay: i * 0.05 }}
                        />
                      </div>
                    </div>
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${getScoreColor(t.percentage)}`}>
                      {t.percentage}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {progress.subject_breakdown?.length > 0 && (
            <div className="glass rounded-xl p-6 border border-white/10">
              <h2 className="text-lg font-semibold text-white mb-4">Subject Performance</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {progress.subject_breakdown.map((sb, i) => (
                  <div key={i} className="p-4 rounded-xl bg-white/5 border border-white/10">
                    <h3 className="text-white font-medium mb-3">{sb.subject}</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between"><span className="text-gray-400">Average</span><span className="text-white font-bold">{sb.average}%</span></div>
                      <div className="flex justify-between"><span className="text-gray-400">Highest</span><span className="text-green-400">{sb.highest}%</span></div>
                      <div className="flex justify-between"><span className="text-gray-400">Lowest</span><span className="text-red-400">{sb.lowest}%</span></div>
                      <div className="flex justify-between"><span className="text-gray-400">Quizzes</span><span className="text-gray-300">{sb.quizzes}</span></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          {progress.timeline?.length === 0 && (
            <div className="text-center py-16 text-gray-500">
              <HiOutlineTrendingUp className="mx-auto mb-4" size={48} />
              <p>No progress data yet. Take some quizzes to see your progress!</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (view === 'concepts' && profile) {
    const concepts = profile.concept_performance || [];
    const sortedConcepts = [...concepts].sort((a, b) => a.mastery_level - b.mastery_level);
    const weakConcepts = sortedConcepts.filter(c => c.mastery_level < 0.4);
    const strongConcepts = sortedConcepts.filter(c => c.mastery_level >= 0.7);
    return (
      <div className="min-h-screen bg-[#0a0a0f]">
        <div className="glass sticky top-0 z-50">
          <div className="max-w-5xl mx-auto px-4 py-3 flex items-center gap-4">
            <button onClick={() => setView('dashboard')} className="text-sm text-purple-400 hover:text-purple-300">&larr; Back</button>
            <span className="text-white font-semibold">My Learning Gaps</span>
          </div>
        </div>
        <div className="max-w-5xl mx-auto px-4 py-8">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
            <div className="glass rounded-xl p-4 border border-purple-500/20"><p className="text-xs text-gray-500 mb-1">Concepts Tracked</p><p className="text-2xl font-bold text-white">{concepts.length}</p></div>
            <div className="glass rounded-xl p-4 border border-red-500/20"><p className="text-xs text-gray-500 mb-1">Need Practice</p><p className="text-2xl font-bold text-red-400">{weakConcepts.length}</p></div>
            <div className="glass rounded-xl p-4 border border-green-500/20"><p className="text-xs text-gray-500 mb-1">Strong Areas</p><p className="text-2xl font-bold text-green-400">{strongConcepts.length}</p></div>
          </div>
          <div className="glass rounded-xl p-6 border border-white/10 mb-6">
            <h2 className="text-lg font-semibold text-white mb-4">All Concepts</h2>
            <div className="space-y-4">
              {sortedConcepts.map((c, i) => (
                <motion.div key={c.concept} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03 }}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-gray-300">{c.concept}</span>
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${getMasteryColor(c.mastery_level)}`} />
                      <span className="text-xs text-gray-400">{Math.round(c.mastery_level * 100)}%</span>
                      <span className={`text-xs px-2 py-0.5 rounded ${c.mastery_level >= 0.7 ? 'text-green-400 bg-green-500/10' : c.mastery_level >= 0.4 ? 'text-yellow-400 bg-yellow-500/10' : 'text-red-400 bg-red-500/10'}`}>
                        {c.mastery_level >= 0.7 ? 'Strong' : c.mastery_level >= 0.4 ? 'Developing' : 'Gap'}
                      </span>
                    </div>
                  </div>
                  <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden">
                    <motion.div className={`h-full rounded-full ${getMasteryColor(c.mastery_level)}`} initial={{ width: 0 }} animate={{ width: `${Math.round(c.mastery_level * 100)}%` }} transition={{ duration: 0.8, delay: i * 0.05 }} />
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">{c.attempts} attempts • {c.correct_attempts} correct</p>
                </motion.div>
              ))}
            </div>
            {concepts.length === 0 && <div className="text-center py-8 text-gray-500 text-sm">No concept data yet.</div>}
          </div>
          {weakConcepts.length > 0 && (
            <div className="glass rounded-xl p-6 border border-purple-500/30 bg-purple-500/5">
              <h3 className="text-white font-semibold mb-2 flex items-center gap-2"><HiOutlineSparkles className="text-purple-400" /> Personalized Recommendation</h3>
              <p className="text-sm text-gray-300 mb-4">Focus on your weakest concepts first. Practice quizzes are auto-generated based on your weak areas.</p>
              <div className="flex flex-wrap gap-3">
                <button onClick={handleGenerateRemediation} disabled={generatingQuizzes} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-cyan-600 text-white text-sm font-medium disabled:opacity-50 hover:shadow-lg hover:shadow-purple-500/25 transition-all">
                  {generatingQuizzes ? <><motion.div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full" animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }} /> Generating...</> : <><HiOutlineSparkles size={16} /> Generate Practice Quizzes</>}
                </button>
                <button onClick={fetchRemediation} className="px-4 py-2.5 rounded-xl border border-purple-500/30 text-purple-400 text-sm font-medium hover:bg-purple-500/10 transition-all">View Existing</button>
              </div>
            </div>
          )}
          {weakConcepts.length === 0 && concepts.length > 0 && (
            <div className="glass rounded-xl p-6 border border-green-500/30 bg-green-500/5 text-center">
              <h3 className="text-white font-semibold mb-2 flex items-center justify-center gap-2"><HiOutlineClipboardCheck className="text-green-400" size={20} /> All Concepts Strong!</h3>
              <p className="text-sm text-gray-300">Great job! You're doing well across all concepts. Keep it up!</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (activeQuiz && !quizResult) {
    const questions = activeQuiz.questions || [];
    const answeredCount = Object.keys(quizAnswers).length;
    return (
      <div className="min-h-screen bg-[#0a0a0f]">
        <div className="glass sticky top-0 z-50">
          <div className="max-w-5xl mx-auto px-4 py-3 flex items-center gap-4">
            <button onClick={handleGoBackToPractice} className="text-sm text-purple-400 hover:text-purple-300">&larr; Back</button>
            <span className="text-white font-semibold">{activeQuiz.quiz_title || 'Practice Quiz'}</span>
            {questions.length > 0 && <span className="text-xs text-gray-500 ml-auto">{answeredCount}/{questions.length} answered</span>}
          </div>
        </div>
        <div className="max-w-3xl mx-auto px-4 py-8">
          <div className="glass rounded-xl p-6 border border-white/10 mb-6">
            <h2 className="text-lg font-semibold text-white mb-2">{activeQuiz.quiz_title || `Practice: ${activeQuiz.concept_name}`}</h2>
            <p className="text-sm text-gray-400">{activeQuiz.quiz?.subject && `${activeQuiz.quiz.subject} `}• {activeQuiz.quiz?.difficulty || 'mixed'} • {activeQuiz.quiz?.total_marks || '?'} marks</p>
            <p className="text-xs text-gray-500 mt-1">Concept: {activeQuiz.concept_name}</p>
          </div>
          {questions.length > 0 ? (
            <>
              <div className="space-y-6">
                {questions.map((q, i) => (
                  <div key={q.id} className="glass rounded-xl p-5 border border-white/10">
                    <p className="text-sm text-white font-medium mb-3"><span className="text-purple-400">Q{i + 1}.</span> {q.question_text}<span className="text-gray-500 ml-2 text-xs">({q.marks} marks)</span></p>
                    {q.question_type === 'mcq' ? (
                      <div className="space-y-2">
                        {(q.options || []).filter(o => o).map((opt, oi) => (
                          <label key={oi} className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${quizAnswers[q.id] === opt ? 'border-purple-500/50 bg-purple-500/10' : 'border-white/10 hover:bg-white/5'}`}>
                            <input type="radio" name={`q_${q.id}`} value={opt} checked={quizAnswers[q.id] === opt} onChange={() => handleAnswerChange(q.id, opt)} className="text-purple-500" />
                            <span className="text-sm text-gray-300">{opt}</span>
                          </label>
                        ))}
                      </div>
                    ) : (
                      <textarea value={quizAnswers[q.id] || ''} onChange={(e) => handleAnswerChange(q.id, e.target.value)} placeholder="Type your answer..." className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm input-glow" rows={3} />
                    )}
                  </div>
                ))}
              </div>
              <button onClick={handleSubmitQuiz} disabled={submittingQuiz || answeredCount === 0} className="w-full mt-6 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-cyan-600 text-white font-medium disabled:opacity-50 hover:scale-[1.02] active:scale-[0.98] transition-transform">
                {submittingQuiz ? <span className="flex items-center justify-center gap-2"><motion.div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full" animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }} /> Submitting...</span> : `Submit Answers (${answeredCount}/${questions.length} answered)`}
              </button>
            </>
          ) : (
            <div className="text-center py-16 text-gray-500">
              <HiOutlineClipboardCheck className="mx-auto mb-4" size={48} />
              <p>No questions available for this practice quiz.</p>
              <p className="text-xs text-gray-600 mt-2">Contact your teacher to regenerate the quiz.</p>
              <button onClick={handleGoBackToPractice} className="mt-6 px-6 py-2.5 rounded-xl bg-purple-500/20 text-purple-400 text-sm hover:bg-purple-500/30 transition-all">Back to Practice Quizzes</button>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (quizResult) {
    const result = quizResult.result || {};
    const pct = quizResult.percentage || result.percentage || 0;
    const score = quizResult.total_score || result.score || 0;
    const total = quizResult.total_marks || result.total_marks || 0;
    const strengths = quizResult.strengths || result.strengths || [];
    const weaknesses = quizResult.weaknesses || result.weaknesses || [];
    const resultColor = pct >= 70 ? 'green' : pct >= 40 ? 'yellow' : 'red';
    const resultGradient = resultColor === 'green' ? 'from-green-500 to-emerald-500' : resultColor === 'yellow' ? 'from-yellow-500 to-orange-500' : 'from-red-500 to-rose-500';
    return (
      <div className="min-h-screen bg-[#0a0a0f]">
        <div className="max-w-3xl mx-auto px-4 py-12">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="glass rounded-2xl p-8 border border-white/10 text-center">
            <div className={`w-20 h-20 mx-auto mb-5 rounded-full bg-gradient-to-br ${resultGradient} flex items-center justify-center shadow-lg`}><span className="text-3xl text-white font-bold">{Math.round(pct)}%</span></div>
            <h2 className="text-2xl font-bold text-white mb-2">Quiz Completed!</h2>
            <p className="text-gray-400 mb-6">Score: {score}/{total} ({Math.round(pct)}%)</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
              <div className="p-5 rounded-xl bg-green-500/10 border border-green-500/20 text-left">
                <p className="text-xs text-green-400 uppercase tracking-wider mb-2">Strengths</p>
                {strengths.length > 0 ? <div className="flex flex-wrap gap-2">{strengths.map((s, i) => <span key={i} className="px-2.5 py-1 rounded-lg bg-green-500/10 text-green-300 text-xs">{s}</span>)}</div> : <p className="text-sm text-gray-400">Keep practicing!</p>}
              </div>
              <div className="p-5 rounded-xl bg-red-500/10 border border-red-500/20 text-left">
                <p className="text-xs text-red-400 uppercase tracking-wider mb-2">Areas to Improve</p>
                {weaknesses.length > 0 ? <div className="flex flex-wrap gap-2">{weaknesses.map((w, i) => <span key={i} className="px-2.5 py-1 rounded-lg bg-red-500/10 text-red-300 text-xs">{w}</span>)}</div> : <p className="text-sm text-gray-400">Great job!</p>}
              </div>
            </div>
            <button onClick={handleGoBackToPractice} className="px-8 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-cyan-600 text-white font-medium hover:scale-[1.02] active:scale-[0.98] transition-transform">Back to Practice Quizzes</button>
          </motion.div>
        </div>
      </div>
    );
  }

  if (view === 'remediation') {
    const quizzes = remediation?.remediation_quizzes || [];
    const pending = quizzes.filter(q => !q.is_completed);
    const completed = quizzes.filter(q => q.is_completed);
    return (
      <div className="min-h-screen bg-[#0a0a0f]">
        <div className="glass sticky top-0 z-50">
          <div className="max-w-5xl mx-auto px-4 py-3 flex items-center gap-4">
            <button onClick={() => setView('dashboard')} className="text-sm text-purple-400 hover:text-purple-300">&larr; {t('common.back', 'Back')}</button>
            <span className="text-white font-semibold">{t('studentPortal.practiceQuizzes', 'Practice Quizzes')}</span>
          </div>
        </div>
        <div className="max-w-5xl mx-auto px-4 py-8">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
            <div className="glass rounded-xl p-4 border border-purple-500/20"><p className="text-xs text-gray-500 mb-1">Total Assigned</p><p className="text-2xl font-bold text-white">{quizzes.length}</p></div>
            <div className="glass rounded-xl p-4 border border-yellow-500/20"><p className="text-xs text-gray-500 mb-1">Pending</p><p className="text-2xl font-bold text-yellow-400">{pending.length}</p></div>
            <div className="glass rounded-xl p-4 border border-green-500/20"><p className="text-xs text-gray-500 mb-1">Completed</p><p className="text-2xl font-bold text-green-400">{completed.length}</p></div>
          </div>
          {pending.length > 0 && (
            <div className="glass rounded-xl p-6 border border-yellow-500/20 mb-6">
              <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2"><HiOutlineBookOpen className="text-yellow-400" /> Pending Practice ({pending.length})</h2>
              <div className="space-y-3">
                {pending.map((q, i) => (
                  <motion.div key={q.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/10 hover:border-purple-500/30 transition-all">
                    <div className="flex-1">
                      <p className="text-white font-medium">{q.quiz_title || `Practice: ${q.concept_name}`}</p>
                      <p className="text-xs text-gray-500 mt-1">{q.quiz?.subject && `${q.quiz.subject} • `}Concept: {q.concept_name}{q.quiz?.questions_count && ` • ${q.quiz.questions_count} questions`}</p>
                    </div>
                    <button onClick={() => handleStartQuiz(q)} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-cyan-600 text-white text-sm font-medium hover:shadow-lg hover:shadow-purple-500/25 transition-all"><HiOutlineAcademicCap size={16} /> Start Quiz</button>
                  </motion.div>
                ))}
              </div>
            </div>
          )}
          {completed.length > 0 && (
            <div className="glass rounded-xl p-6 border border-green-500/20">
              <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2"><HiOutlineClipboardCheck className="text-green-400" /> Completed ({completed.length})</h2>
              <div className="space-y-3">
                {completed.map((q, i) => (
                  <div key={q.id} className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/10">
                    <div><p className="text-white font-medium">{q.quiz_title || `Practice: ${q.concept_name}`}</p><p className="text-xs text-gray-500 mt-1">Concept: {q.concept_name}</p></div>
                    <div className="text-right"><span className="text-lg font-bold text-green-400">{Math.round(q.score || 0)}%</span><p className="text-xs text-gray-500">Score</p></div>
                  </div>
                ))}
              </div>
            </div>
          )}
          {quizzes.length === 0 && (
            <div className="text-center py-16 text-gray-500">
              <HiOutlineClipboardCheck className="mx-auto mb-4" size={48} />
              <p className="mb-2">{t('studentPortal.noPracticeQuizzes', 'No practice quizzes assigned yet.')}</p>
              <p className="text-sm text-gray-400 mb-6">Generate practice quizzes from your weak concepts to strengthen your understanding.</p>
              <button onClick={handleGenerateRemediation} disabled={generatingQuizzes} className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-cyan-600 text-white text-sm font-medium disabled:opacity-50 hover:shadow-lg hover:shadow-purple-500/25 transition-all">
                {generatingQuizzes ? <><motion.div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full" animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }} /> Generating Practice Quizzes...</> : <><HiOutlineSparkles size={18} /> Generate Practice Quizzes</>}
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return null;
}
