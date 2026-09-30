import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import AnimatedCard from '../components/AnimatedCard';
import { PageLoader } from '../components/LoadingScreen';
import PrintQuiz from '../components/PrintQuiz';
import { quizAPI, studentAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  HiOutlineAcademicCap,
  HiOutlinePlus,
  HiOutlineTrash,
  HiOutlineSparkles,
  HiOutlineX,
  HiOutlineEye,
  HiOutlinePrinter,
  HiOutlineCamera,
  HiOutlineUpload,
} from 'react-icons/hi';

export default function Quizzes() {
  const { t } = useTranslation();
  const { user, activeWorkspace } = useAuth();
  const [quizzes, setQuizzes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('list');
  const [selectedQuiz, setSelectedQuiz] = useState(null);
  const [quizResults, setQuizResults] = useState([]);

  const [quizForm, setQuizForm] = useState({
    title: '',
    subject: activeWorkspace?.subject_name || '',
    subject_id: activeWorkspace?.subject_id || null,
    topic: '',
    difficulty: 'medium',
    duration_minutes: 30,
    class_name: activeWorkspace?.class_name || '',
    class_id: activeWorkspace?.class_id || null,
  });

  const [aiForm, setAiForm] = useState({
    subject: activeWorkspace?.subject_name || '',
    subject_id: activeWorkspace?.subject_id || null,
    topic: '',
    difficulty: 'medium',
    num_questions: 5,
    total_marks: 25,
    duration_minutes: 30,
    class_name: activeWorkspace?.class_name || '',
    class_id: activeWorkspace?.class_id || null,
  });

  const [questions, setQuestions] = useState([]);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [printQuiz, setPrintQuiz] = useState(null);
  const [students, setStudents] = useState([]);
  const [selectedStudentId, setSelectedStudentId] = useState('');

  useEffect(() => {
    fetchQuizzes();
    fetchStudents();
  }, [activeWorkspace]);

  const fetchStudents = async () => {
    try {
      const params = {};
      if (activeWorkspace) params.assignment_id = activeWorkspace.assignment_id;
      const res = await studentAPI.getAll(params);
      setStudents(res.data.students || []);
    } catch (err) {
      console.error('Error fetching students:', err);
    }
  };

  useEffect(() => {
    if (activeWorkspace) {
      setQuizForm(prev => ({
        ...prev,
        subject: activeWorkspace.subject_name,
        subject_id: activeWorkspace.subject_id,
        class_name: activeWorkspace.class_name,
        class_id: activeWorkspace.class_id,
      }));
      setAiForm(prev => ({
        ...prev,
        subject: activeWorkspace.subject_name,
        subject_id: activeWorkspace.subject_id,
        class_name: activeWorkspace.class_name,
        class_id: activeWorkspace.class_id,
      }));
    }
  }, [activeWorkspace]);

  const fetchQuizzes = async () => {
    try {
      const params = {};
      if (activeWorkspace) {
        params.assignment_id = activeWorkspace.assignment_id;
      }
      const res = await quizAPI.getAll(params);
      setQuizzes(res.data.quizzes || []);
    } catch (err) {
      console.error('Error fetching quizzes:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchQuizResults = async (quizId) => {
    try {
      const res = await quizAPI.getResults(quizId);
      setQuizResults(res.data.results || []);
      setSelectedQuiz(res.data.quiz);
      setView('results');
    } catch (err) {
      console.error('Error fetching results:', err);
    }
  };

  const handlePrint = async (quizId) => {
    try {
      const res = await quizAPI.getPrintData(quizId);
      setPrintQuiz(res.data.print_data);
    } catch (err) {
      console.error('Error fetching print data:', err);
    }
  };

  const addQuestion = (type = 'mcq') => {
    setQuestions([
      ...questions,
      {
        question_text: '',
        question_type: type,
        options: type === 'mcq' ? ['', '', '', ''] : [],
        correct_answer: '',
        marks: 5,
        concept_tag: '',
      },
    ]);
  };

  const updateQuestion = (index, field, value) => {
    const updated = [...questions];
    updated[index][field] = value;
    setQuestions(updated);
  };

  const removeQuestion = (index) => {
    setQuestions(questions.filter((_, i) => i !== index));
  };

  const handleCreateQuiz = async (e) => {
    e.preventDefault();
    if (questions.length === 0) {
      alert('Add at least one question');
      return;
    }
    setSaving(true);
    try {
      const totalMarks = questions.reduce((sum, q) => sum + (q.marks || 1), 0);
      await quizAPI.create({
        ...quizForm,
        total_marks: totalMarks,
        questions,
        student_id: selectedStudentId ? parseInt(selectedStudentId) : null,
      });
      setView('list');
      setQuestions([]);
      setSelectedStudentId('');
      setQuizForm(prev => ({
        ...prev,
        title: '',
        topic: '',
        difficulty: 'medium',
        duration_minutes: 30,
      }));
      fetchQuizzes();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to create quiz');
    } finally {
      setSaving(false);
    }
  };

  const handleGenerateAI = async (e) => {
    e.preventDefault();
    setGenerating(true);
    try {
      await quizAPI.generateAI({
        ...aiForm,
        student_id: selectedStudentId ? parseInt(selectedStudentId) : null,
      });
      setView('list');
      setSelectedStudentId('');
      fetchQuizzes();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to generate quiz');
    } finally {
      setGenerating(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this quiz?')) return;
    try {
      await quizAPI.delete(id);
      fetchQuizzes();
    } catch (err) {
      console.error('Delete error:', err);
    }
  };

  if (loading) return <PageLoader />;

  // Print Quiz View
  if (printQuiz) {
    return <PrintQuiz data={printQuiz} onClose={() => setPrintQuiz(null)} />;
  }

  if (view === 'results' && selectedQuiz) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <button onClick={() => { setView('list'); setSelectedQuiz(null); }}
            className="text-sm text-purple-400 hover:text-purple-300 mb-4">
            &larr; {t('quizzes.backToQuizzes')}
          </button>
          <h1 className="text-2xl font-bold text-white mb-2">{selectedQuiz.title}</h1>
          <p className="text-gray-400 text-sm mb-6">
            {selectedQuiz.subject} • {selectedQuiz.difficulty} • {quizResults.length} {t('quizzes.submissions')}
          </p>

          <div className="space-y-4">
            {quizResults.map((result, i) => (
              <AnimatedCard key={result.id} delay={i * 0.05}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-white font-medium">{result.student_name || `Student #${result.student_id}`}</p>
                    <p className="text-gray-400 text-xs">{t('quizzes.score')}: {result.score}/{result.total_marks} ({result.percentage}%)</p>
                  </div>
                  <div className={`px-3 py-1 rounded-lg text-xs font-medium ${
                    result.percentage >= 70 ? 'bg-green-500/20 text-green-400' :
                    result.percentage >= 40 ? 'bg-yellow-500/20 text-yellow-400' :
                    'bg-red-500/20 text-red-400'
                  }`}>{result.percentage}%</div>
                </div>
              </AnimatedCard>
            ))}
            {quizResults.length === 0 && (
              <div className="text-center py-12 text-gray-500">{t('quizzes.noSubmissions')}</div>
            )}
          </div>
        </motion.div>
      </div>
    );
  }

  if (view === 'take' && selectedQuiz) {
    return (
      <QuizTakeView
        quiz={selectedQuiz}
        onBack={() => { setView('list'); setSelectedQuiz(null); }}
      />
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <HiOutlineAcademicCap className="text-purple-400" />
            {t('quizzes.title')}
          </h1>
          <p className="text-gray-400 text-sm mt-1">
            {activeWorkspace ? `${activeWorkspace.class_name} • ${activeWorkspace.subject_name}` : ''}
            {' • '}{quizzes.length} quizzes
          </p>
        </div>
        <div className="flex items-center gap-3">
          <motion.button onClick={() => { setView('ai-generate'); setQuestions([]); }}
            whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-purple-500/30 text-purple-400 text-sm hover:bg-purple-500/10 transition-all">
            <HiOutlineSparkles size={16} />
            {t('quizzes.aiGenerate')}
          </motion.button>
          <motion.button onClick={() => { setView('create'); setQuestions([]); }}
            whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-cyan-600 text-white text-sm font-medium">
            <HiOutlinePlus size={16} />
            {t('quizzes.createQuiz')}
          </motion.button>
        </div>
      </motion.div>

      {/* Create Quiz Form */}
      {view === 'create' && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <AnimatedCard>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-white">{t('quizzes.createManual')}</h2>
              <span className="text-xs text-gray-500">
                {activeWorkspace?.class_name} • {activeWorkspace?.subject_name}
              </span>
            </div>
            <form onSubmit={handleCreateQuiz} className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-sm text-gray-300 mb-1.5">Quiz Title *</label>
                  <input type="text" value={quizForm.title}
                    onChange={(e) => setQuizForm({ ...quizForm, title: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white text-sm input-glow" required />
                </div>
                <div>
                  <label className="block text-sm text-gray-300 mb-1.5">Duration (min)</label>
                  <input type="number" value={quizForm.duration_minutes}
                    onChange={(e) => setQuizForm({ ...quizForm, duration_minutes: parseInt(e.target.value) })}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white text-sm input-glow" />
                </div>
                <div>
                  <label className="block text-sm text-gray-300 mb-1.5">Topic</label>
                  <input type="text" value={quizForm.topic}
                    onChange={(e) => setQuizForm({ ...quizForm, topic: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white text-sm input-glow" />
                </div>
                <div>
                  <label className="block text-sm text-gray-300 mb-1.5">Difficulty</label>
                  <select value={quizForm.difficulty}
                    onChange={(e) => setQuizForm({ ...quizForm, difficulty: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white text-sm input-glow">
                    <option value="easy" className="bg-gray-900">Easy</option>
                    <option value="medium" className="bg-gray-900">Medium</option>
                    <option value="hard" className="bg-gray-900">Hard</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-gray-300 mb-1.5">
                    Assign to Student
                    <span className="text-gray-600 ml-1">(optional)</span>
                  </label>
                  <select value={selectedStudentId}
                    onChange={(e) => setSelectedStudentId(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white text-sm input-glow">
                    <option value="" className="bg-gray-900">— Whole Class —</option>
                    {students.map((s) => (
                      <option key={s.id} value={s.id} className="bg-gray-900">{s.name} ({s.roll_number})</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="border-t border-white/10 pt-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-white font-medium">Questions</h3>
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-purple-400">Total: {questions.reduce((s, q) => s + (q.marks || 1), 0)}</span>
                    <button type="button" onClick={() => addQuestion('mcq')}
                      className="px-3 py-1.5 rounded-lg bg-purple-500/20 text-purple-400 text-xs hover:bg-purple-500/30">+ MCQ</button>
                    <button type="button" onClick={() => addQuestion('short')}
                      className="px-3 py-1.5 rounded-lg bg-cyan-500/20 text-cyan-400 text-xs hover:bg-cyan-500/30">+ Short</button>
                    <button type="button" onClick={() => addQuestion('descriptive')}
                      className="px-3 py-1.5 rounded-lg bg-pink-500/20 text-pink-400 text-xs hover:bg-pink-500/30">+ Descriptive</button>
                  </div>
                </div>

                <div className="space-y-4">
                  {questions.map((q, i) => (
                    <motion.div key={i} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
                      className="p-4 rounded-xl bg-white/5 border border-white/10">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-xs text-gray-500 bg-white/5 px-2 py-1 rounded">Q{i + 1} • {q.question_type.toUpperCase()}</span>
                        <button type="button" onClick={() => removeQuestion(i)} className="text-red-400 hover:text-red-300"><HiOutlineTrash size={16} /></button>
                      </div>
                      <textarea value={q.question_text} onChange={(e) => updateQuestion(i, 'question_text', e.target.value)}
                        placeholder="Enter question text..." className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white text-sm input-glow mb-2" rows={2} />
                      {q.question_type === 'mcq' && (
                        <div className="grid grid-cols-2 gap-2 mb-2">
                          {(q.options || ['', '', '', '']).map((opt, oi) => (
                            <input key={oi} value={opt}
                              onChange={(e) => { const opts = [...q.options]; opts[oi] = e.target.value; updateQuestion(i, 'options', opts); }}
                              placeholder={`Option ${String.fromCharCode(65 + oi)}`}
                              className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-white text-xs input-glow" />
                          ))}
                        </div>
                      )}
                      <div className="grid grid-cols-3 gap-3">
                        <input value={q.correct_answer} onChange={(e) => updateQuestion(i, 'correct_answer', e.target.value)}
                          placeholder="Correct answer" className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-white text-xs input-glow" />
                        <input type="number" value={q.marks} onChange={(e) => updateQuestion(i, 'marks', parseFloat(e.target.value) || 0)}
                          placeholder="Marks" className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-white text-xs input-glow" />
                        <input value={q.concept_tag} onChange={(e) => updateQuestion(i, 'concept_tag', e.target.value)}
                          placeholder="Concept tag" className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-white text-xs input-glow" />
                      </div>
                    </motion.div>
                  ))}
                </div>
                {questions.length === 0 && (
                  <div className="text-center py-8 text-gray-500 text-sm">No questions added yet.</div>
                )}
              </div>

              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setView('list')}
                  className="px-6 py-2.5 rounded-xl border border-white/10 text-sm text-gray-300 hover:bg-white/5">Cancel</button>
                <button type="submit" disabled={saving || questions.length === 0}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-cyan-600 text-white text-sm font-medium disabled:opacity-50">
                  {saving ? 'Creating...' : `Create Quiz (${questions.reduce((s, q) => s + (q.marks || 1), 0)} marks)`}
                </button>
              </div>
            </form>
          </AnimatedCard>
        </motion.div>
      )}

      {/* AI Generate */}
      {view === 'ai-generate' && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <AnimatedCard glow="purple">
            <div className="flex items-center gap-3 mb-6">
              <HiOutlineSparkles className="text-purple-400" size={24} />
              <div>
                <h2 className="text-lg font-semibold text-white">AI Quiz Generation</h2>
                <p className="text-gray-400 text-sm">{t('quizzes.aiPowered')}</p>
              </div>
            </div>
            <form onSubmit={handleGenerateAI} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-300 mb-1.5">Subject *</label>
                  <input type="text" value={aiForm.subject} disabled
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-gray-400 text-sm input-glow" />
                </div>
                <div>
                  <label className="block text-sm text-gray-300 mb-1.5">Topic *</label>
                  <input type="text" value={aiForm.topic} onChange={(e) => setAiForm({ ...aiForm, topic: e.target.value })}
                    placeholder="e.g., Algebra, Photosynthesis" className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white text-sm input-glow" required />
                </div>
                <div>
                  <label className="block text-sm text-gray-300 mb-1.5">Difficulty</label>
                  <select value={aiForm.difficulty} onChange={(e) => setAiForm({ ...aiForm, difficulty: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white text-sm input-glow">
                    <option value="easy" className="bg-gray-900">Easy</option>
                    <option value="medium" className="bg-gray-900">Medium</option>
                    <option value="hard" className="bg-gray-900">Hard</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-gray-300 mb-1.5">Duration (min)</label>
                  <input type="number" value={aiForm.duration_minutes}
                    onChange={(e) => setAiForm({ ...aiForm, duration_minutes: parseInt(e.target.value) })}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white text-sm input-glow" />
                </div>
                <div>
                  <label className="block text-sm text-gray-300 mb-1.5">Number of Questions</label>
                  <input type="number" value={aiForm.num_questions}
                    onChange={(e) => setAiForm({ ...aiForm, num_questions: parseInt(e.target.value) })} min={3} max={20}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white text-sm input-glow" />
                </div>
                <div>
                  <label className="block text-sm text-gray-300 mb-1.5">Total Marks</label>
                  <input type="number" value={aiForm.total_marks}
                    onChange={(e) => setAiForm({ ...aiForm, total_marks: e.target.value === '' ? 0 : parseInt(e.target.value) })}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white text-sm input-glow" />
                </div>
                <div>
                  <label className="block text-sm text-gray-300 mb-1.5">
                    Assign to Student
                    <span className="text-gray-600 ml-1">(optional)</span>
                  </label>
                  <select value={selectedStudentId}
                    onChange={(e) => setSelectedStudentId(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white text-sm input-glow">
                    <option value="" className="bg-gray-900">— Whole Class —</option>
                    {students.map((s) => (
                      <option key={s.id} value={s.id} className="bg-gray-900">{s.name} ({s.roll_number})</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setView('list')}
                  className="px-6 py-2.5 rounded-xl border border-white/10 text-sm text-gray-300 hover:bg-white/5">Cancel</button>
                <button type="submit" disabled={generating}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-cyan-600 text-white text-sm font-medium disabled:opacity-50">
                  {generating ? (
                    <span className="flex items-center gap-2">
                      <motion.div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full" animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }} />
                      Generating...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2"><HiOutlineSparkles size={16} /> Generate with AI</span>
                  )}
                </button>
              </div>
            </form>
          </AnimatedCard>
        </motion.div>
      )}

      {/* Quiz List */}
      {view === 'list' && (
        <div className="space-y-4">
          <AnimatePresence>
            {quizzes.map((quiz, i) => (
              <motion.div key={quiz.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ delay: i * 0.05 }}>
                <AnimatedCard glow={quiz.is_ai_generated ? 'purple' : 'cyan'}>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-white font-medium">{quiz.title}</h3>
                        {quiz.is_ai_generated && <span className="px-2 py-0.5 rounded bg-purple-500/20 text-purple-400 text-xs">AI</span>}
                      </div>
                      <p className="text-gray-400 text-xs mb-1">
                        {quiz.subject} • {quiz.difficulty} • {quiz.questions_count} questions • {quiz.total_marks} marks
                      </p>
                      <p className="text-gray-500 text-xs">{quiz.class_name}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => handlePrint(quiz.id)}
                        className="p-2 rounded-lg hover:bg-white/5 text-gray-400 hover:text-purple-400 transition-all" title="Print Quiz">
                        <HiOutlinePrinter size={16} />
                      </button>
                      <button onClick={() => { setSelectedQuiz(quiz); setView('take'); }}
                        className="p-2 rounded-lg hover:bg-white/5 text-gray-400 hover:text-green-400 transition-all" title="Take Quiz">
                        <HiOutlineAcademicCap size={16} />
                      </button>
                      <button onClick={() => fetchQuizResults(quiz.id)}
                        className="p-2 rounded-lg hover:bg-white/5 text-gray-400 hover:text-cyan-400 transition-all" title="View Results">
                        <HiOutlineEye size={16} />
                      </button>
                      <button onClick={() => handleDelete(quiz.id)}
                        className="p-2 rounded-lg hover:bg-white/5 text-gray-400 hover:text-red-400 transition-all" title="Delete">
                        <HiOutlineTrash size={16} />
                      </button>
                    </div>
                  </div>
                </AnimatedCard>
              </motion.div>
            ))}
          </AnimatePresence>

          {quizzes.length === 0 && (
            <div className="text-center py-16">
              <HiOutlineAcademicCap className="mx-auto text-gray-600 mb-4" size={48} />
              <p className="text-gray-400 mb-4">No quizzes yet for {activeWorkspace ? `${activeWorkspace.class_name} - ${activeWorkspace.subject_name}` : 'this workspace'}</p>
              <div className="flex justify-center gap-3">
                <button onClick={() => { setView('create'); setQuestions([]); }}
                  className="px-4 py-2 rounded-xl bg-purple-500/20 text-purple-400 text-sm hover:bg-purple-500/30">Create Manual Quiz</button>
                <button onClick={() => { setView('ai-generate'); }}
                  className="px-4 py-2 rounded-xl bg-cyan-500/20 text-cyan-400 text-sm hover:bg-cyan-500/30">Generate with AI</button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Quiz Take View
function QuizTakeView({ quiz, onBack }) {
  const { activeWorkspace } = useAuth();
  const [students, setStudents] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState('');
  const [answers, setAnswers] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [result, setResult] = useState(null);
  const [questions, setQuestions] = useState([]);

  useEffect(() => {
    fetchQuizDetails();
    fetchStudents();
  }, []);

  const fetchQuizDetails = async () => {
    try {
      const res = await quizAPI.getById(quiz.id);
      setQuestions(res.data.questions || []);
    } catch (err) { console.error(err); }
  };

  const fetchStudents = async () => {
    try {
      const params = {};
      if (activeWorkspace) params.assignment_id = activeWorkspace.assignment_id;
      const res = await studentAPI.getAll(params);
      setStudents(res.data.students || []);
    } catch (err) { console.error(err); }
  };

  const handleSubmit = async () => {
    if (!selectedStudent) { alert('Please select a student'); return; }
    setSubmitting(true);
    try {
      const formattedAnswers = Object.entries(answers).map(([qId, answer]) => ({ question_id: parseInt(qId), answer }));
      const res = await quizAPI.submitQuiz(quiz.id, {
        student_id: parseInt(selectedStudent),
        answers: formattedAnswers,
      });
      setResult(res.data);
      setSubmitted(true);
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to submit');
    } finally { setSubmitting(false); }
  };

  if (submitted && result) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <AnimatedCard glow="green">
            <div className="text-center mb-6">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center">
                <span className="text-2xl">✓</span>
              </div>
              <h2 className="text-xl font-bold text-white">Quiz Submitted!</h2>
              <p className="text-gray-400 mt-1">Score: {result.result.score}/{result.result.total_marks} ({result.result.percentage}%)</p>
            </div>
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="p-4 rounded-xl bg-green-500/10 border border-green-500/20">
                <p className="text-xs text-green-400 mb-1">Strengths</p>
                <p className="text-sm text-white">{result.result.strengths?.length > 0 ? result.result.strengths.join(', ') : 'Good performance'}</p>
              </div>
              <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20">
                <p className="text-xs text-red-400 mb-1">Areas to Improve</p>
                <p className="text-sm text-white">{result.result.weaknesses?.length > 0 ? result.result.weaknesses.join(', ') : 'Keep practicing'}</p>
              </div>
            </div>
            <button onClick={onBack} className="w-full py-3 rounded-xl bg-gradient-to-r from-purple-600 to-cyan-600 text-white font-medium">Back to Quizzes</button>
          </AnimatedCard>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <button onClick={onBack} className="text-sm text-purple-400 hover:text-purple-300 mb-4">&larr; Back</button>
        <AnimatedCard>
          <div className="mb-6">
            <h2 className="text-xl font-bold text-white">{quiz.title}</h2>
            <p className="text-gray-400 text-sm">{quiz.subject} • {quiz.difficulty} • {quiz.total_marks} marks</p>
          </div>

          <div className="mb-6">
            <label className="block text-sm text-gray-300 mb-2">Select Student *</label>
            <select value={selectedStudent} onChange={(e) => setSelectedStudent(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white text-sm input-glow">
              <option value="" className="bg-gray-900">Choose a student...</option>
              {students.map((s) => (
                <option key={s.id} value={s.id} className="bg-gray-900">{s.name} ({s.roll_number})</option>
              ))}
            </select>
          </div>

          <div className="space-y-6">
            {questions.map((q, i) => (
              <div key={q.id} className="p-4 rounded-xl bg-white/5 border border-white/10">
                <p className="text-sm text-white font-medium mb-3">Q{i + 1}. {q.question_text} <span className="text-gray-500 ml-2">({q.marks} marks)</span></p>
                {q.question_type === 'mcq' ? (
                  <div className="space-y-2">
                    {(q.options || []).filter(o => o).map((opt, oi) => (
                      <label key={oi} className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                        answers[q.id] === opt ? 'border-purple-500/50 bg-purple-500/10' : 'border-white/10 hover:bg-white/5'
                      }`}>
                        <input type="radio" name={`q_${q.id}`} value={opt}
                          checked={answers[q.id] === opt}
                          onChange={() => setAnswers({...answers, [q.id]: opt})}
                          className="text-purple-500" />
                        <span className="text-sm text-gray-300">{opt}</span>
                      </label>
                    ))}
                  </div>
                ) : (
                  <textarea value={answers[q.id] || ''}
                    onChange={(e) => setAnswers({...answers, [q.id]: e.target.value})}
                    placeholder="Type your answer..." className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white text-sm input-glow" rows={3} />
                )}
              </div>
            ))}
          </div>

          <button onClick={handleSubmit} disabled={submitting || !selectedStudent}
            className="w-full mt-6 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-cyan-600 text-white font-medium disabled:opacity-50">
            {submitting ? 'Submitting...' : `Submit Quiz (${Object.keys(answers).length}/${questions.length} answered)`}
          </button>
        </AnimatedCard>
      </motion.div>
    </div>
  );
}
