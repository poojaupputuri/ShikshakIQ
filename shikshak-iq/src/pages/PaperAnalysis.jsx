import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import AnimatedCard from '../components/AnimatedCard';
import { PageLoader } from '../components/LoadingScreen';
import { quizAPI, studentAPI, paperAPI } from '../services/api';
import {
  HiOutlineCamera,
  HiOutlineUpload,
  HiOutlineDocumentText,
  HiOutlinePhotograph,
  HiOutlineX,
  HiOutlineCheck,
  HiOutlineExclamation,
  HiOutlineRefresh,
  HiOutlineSearch,
  HiOutlineEye,
  HiOutlineDownload,
  HiOutlineTrash,
  HiOutlineAcademicCap,
  HiOutlineSparkles,
} from 'react-icons/hi';

export default function PaperAnalysis() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('upload');
  const { user, activeWorkspace } = useAuth();
  const [quizzes, setQuizzes] = useState([]);
  const [students, setStudents] = useState([]);
  const [selectedQuiz, setSelectedQuiz] = useState('');
  const [loading, setLoading] = useState(true);
  const [papers, setPapers] = useState([]);
  const [processing, setProcessing] = useState(false);
  const [processProgress, setProcessProgress] = useState({ current: 0, total: 0 });

  // Camera state
  const [showCamera, setShowCamera] = useState(false);
  const [cameraStream, setCameraStream] = useState(null);
  const [capturedImage, setCapturedImage] = useState(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  // Upload state
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef(null);

  // Results
  const [analysisResults, setAnalysisResults] = useState([]);
  const [showResults, setShowResults] = useState(false);

  useEffect(() => {
    loadData();
  }, [activeWorkspace]);

  const loadData = async () => {
    try {
      const params = {};
      if (activeWorkspace) params.assignment_id = activeWorkspace.assignment_id;
      const [quizRes, stuRes] = await Promise.all([
        quizAPI.getAll(params),
        studentAPI.getAll(params),
      ]);
      setQuizzes(quizRes.data.quizzes || []);
      setStudents(stuRes.data.students || []);
    } catch (err) {
      console.error('Load error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Camera functions
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } },
      });
      setCameraStream(stream);
      setShowCamera(true);
      setCapturedImage(null);
    } catch (err) {
      alert(t('errors.networkError'));
    }
  };

  useEffect(() => {
    if (showCamera && videoRef.current && cameraStream) {
      videoRef.current.srcObject = cameraStream;
    }
    return () => {
      if (cameraStream) {
        cameraStream.getTracks().forEach((t) => t.stop());
      }
    };
  }, [showCamera, cameraStream]);

  const capturePhoto = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (video && canvas) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0);
      const imageData = canvas.toDataURL('image/jpeg', 0.95);
      setCapturedImage(imageData);
      cameraStream?.getTracks().forEach((t) => t.stop());
      setShowCamera(false);
    }
  }, [cameraStream]);

  const retakePhoto = () => {
    setCapturedImage(null);
    startCamera();
  };

  // Upload functions
  const handleDragOver = (e) => {
    e.preventDefault();
    setDragOver(true);
  };
  const handleDragLeave = () => setDragOver(false);

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const files = Array.from(e.dataTransfer.files).filter((f) =>
      ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'].includes(f.type)
    );
    setUploadedFiles((prev) => [...prev, ...files]);
  };

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files).filter((f) =>
      ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'].includes(f.type)
    );
    setUploadedFiles((prev) => [...prev, ...files]);
    e.target.value = '';
  };

  const removeFile = (index) => {
    setUploadedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const removeCaptured = () => {
    setCapturedImage(null);
  };

  // Process papers
  const processPapers = async () => {
    if (!selectedQuiz) {
      alert(t('quizzes.quizTitle') + ' ' + t('errors.required'));
      return;
    }

    const allPapers = [
      ...(capturedImage ? [{ data: capturedImage, name: 'captured.jpg', type: 'image/jpeg' }] : []),
      ...uploadedFiles.map((f) => ({ data: null, file: f, name: f.name, type: f.type })),
    ];

    if (allPapers.length === 0) {
      alert(t('paperAnalysis.noPapersDesc'));
      return;
    }

    setProcessing(true);
    setProcessProgress({ current: 0, total: allPapers.length });
    const results = [];

    for (let i = 0; i < allPapers.length; i++) {
      setProcessProgress({ current: i + 1, total: allPapers.length });
      try {
        let imageData = allPapers[i].data;
        if (!imageData && allPapers[i].file) {
          // Convert file to base64
          imageData = await fileToBase64(allPapers[i].file);
        }
        const res = await paperAPI.analyzePaper({
          quiz_id: parseInt(selectedQuiz),
          image_data: imageData,
        });
        results.push(res.data);
      } catch (err) {
        results.push({
          error: true,
          name: allPapers[i].name,
          message: err.response?.data?.error || 'Processing failed',
        });
      }
    }

    setPapers(results);
    setAnalysisResults(results);
    setShowResults(true);
    setProcessing(false);

    // Reset inputs
    setCapturedImage(null);
    setUploadedFiles([]);
  };

  const fileToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const base64 = reader.result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = (err) => reject(err);
    });
  };

  if (loading) return <PageLoader />;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <h1 className="text-2xl font-bold text-white flex items-center gap-3 mb-2">
          <HiOutlineAcademicCap className="text-purple-400" />
          {t('paperAnalysis.title')}
        </h1>
        <p className="text-gray-400 text-sm">
          {t('paperAnalysis.uploadPapers')} / {t('paperAnalysis.scanPaper')} — {t('paperAnalysis.processing')}
        </p>
      </motion.div>

      {/* Quiz Select */}
      <AnimatedCard className="mb-6" glow="purple">
        <div className="flex items-center gap-3">
          <HiOutlineAcademicCap className="text-purple-400 shrink-0" size={20} />
          <select
            value={selectedQuiz}
            onChange={(e) => setSelectedQuiz(e.target.value)}
            className="flex-1 bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none input-glow"
          >
            <option value="" className="bg-gray-900">{t('quizzes.quizTitle')} *</option>
            {quizzes.map((q) => (
              <option key={q.id} value={q.id} className="bg-gray-900">
                {q.title} ({q.subject} • {q.total_marks} marks)
              </option>
            ))}
          </select>
        </div>
      </AnimatedCard>

      {/* Input Tabs */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setActiveTab('camera')}
          className={`flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-medium transition-all ${
            activeTab === 'camera'
              ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
              : 'bg-white/5 text-gray-400 border border-white/10 hover:bg-white/10'
          }`}
        >
          <HiOutlineCamera size={18} />
          {t('paperAnalysis.camera')}
        </button>
        <button
          onClick={() => setActiveTab('upload')}
          className={`flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-medium transition-all ${
            activeTab === 'upload'
              ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
              : 'bg-white/5 text-gray-400 border border-white/10 hover:bg-white/10'
          }`}
        >
          <HiOutlineUpload size={18} />
          {t('paperAnalysis.upload')}
        </button>
      </div>

      {/* Camera Tab */}
      <AnimatePresence mode="wait">
        {activeTab === 'camera' && (
          <motion.div
            key="camera"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
          >
            <AnimatedCard glow="purple" className="mb-6">
              {!showCamera && !capturedImage && (
                <div className="text-center py-12">
                  <motion.button
                    onClick={startCamera}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="inline-flex flex-col items-center gap-4 p-8 rounded-2xl border-2 border-dashed border-purple-500/30 hover:border-purple-500/60 transition-all"
                  >
                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                      <HiOutlineCamera className="text-white" size={28} />
                    </div>
                    <div>
                      <p className="text-white font-medium">{t('paperAnalysis.scanPaper')}</p>
                      <p className="text-gray-500 text-xs mt-1">{t('paperAnalysis.scanningInstructions')}</p>
                    </div>
                  </motion.button>
                </div>
              )}

              {showCamera && (
                <div className="relative">
                  {/* Scanning Frame */}
                  <div className="relative rounded-xl overflow-hidden bg-black">
                    <video ref={videoRef} autoPlay playsInline className="w-full max-h-[500px] object-contain" />

                    {/* Scanning Overlay */}
                    <div className="absolute inset-0 pointer-events-none">
                      {/* Scan Line Animation */}
                      <motion.div
                        className="absolute left-0 right-0 h-1 bg-gradient-to-r from-transparent via-purple-500 to-transparent"
                        animate={{ top: ['0%', '100%', '0%'] }}
                        transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
                      />
                      {/* Corner brackets */}
                      <div className="absolute top-4 left-4 w-12 h-12 border-t-2 border-l-2 border-purple-400 rounded-tl-xl" />
                      <div className="absolute top-4 right-4 w-12 h-12 border-t-2 border-r-2 border-purple-400 rounded-tr-xl" />
                      <div className="absolute bottom-4 left-4 w-12 h-12 border-b-2 border-l-2 border-purple-400 rounded-bl-xl" />
                      <div className="absolute bottom-4 right-4 w-12 h-12 border-b-2 border-r-2 border-purple-400 rounded-br-xl" />
                      {/* Glow effect */}
                      <div className="absolute inset-8 border-2 border-purple-500/10 rounded-2xl" />
                    </div>
                  </div>

                  <div className="flex justify-center gap-3 mt-4">
                    <motion.button
                      onClick={capturePhoto}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className="px-8 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-cyan-600 text-white font-medium text-sm"
                    >
                      <span className="flex items-center gap-2">
                        <HiOutlineCamera size={18} />
                        {t('paperAnalysis.capturePhoto')}
                      </span>
                    </motion.button>
                    <button
                      onClick={() => {
                        setShowCamera(false);
                        cameraStream?.getTracks().forEach((t) => t.stop());
                      }}
                      className="px-6 py-3 rounded-xl bg-white/5 text-gray-400 text-sm hover:bg-white/10 transition-all"
                    >
                      {t('app.cancel')}
                    </button>
                  </div>
                </div>
              )}

              {capturedImage && (
                <div>
                  <div className="relative rounded-xl overflow-hidden mb-4">
                    <img src={capturedImage} alt="Captured paper" className="w-full max-h-[500px] object-contain" />
                    <div className="absolute inset-0 ring-2 ring-green-500/30 rounded-xl pointer-events-none" />
                  </div>
                  <div className="flex justify-center gap-3">
                    <button
                      onClick={retakePhoto}
                      className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 text-gray-400 text-sm hover:bg-white/10 transition-all"
                    >
                      <HiOutlineRefresh size={16} />
                      {t('paperAnalysis.retakePhoto')}
                    </button>
                    <button
                      onClick={() => { setCapturedImage(null); setShowCamera(false); }}
                      className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-500/10 text-red-400 text-sm hover:bg-red-500/20 transition-all"
                    >
                      <HiOutlineTrash size={16} />
                      {t('app.delete')}
                    </button>
                  </div>
                </div>
              )}
            </AnimatedCard>
          </motion.div>
        )}

        {/* Upload Tab */}
        {activeTab === 'upload' && (
          <motion.div
            key="upload"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            <AnimatedCard glow="cyan" className="mb-6">
              {/* Drag & Drop Area */}
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
                  dragOver
                    ? 'border-purple-500 bg-purple-500/5'
                    : 'border-white/20 hover:border-purple-500/50 hover:bg-white/5'
                }`}
              >
                <HiOutlineUpload className="mx-auto text-gray-500 mb-3" size={36} />
                <p className="text-white font-medium mb-1">{t('paperAnalysis.dragDrop')}</p>
                <p className="text-gray-500 text-xs mb-3">{t('paperAnalysis.dragDropDesc')}</p>
                <p className="text-gray-500 text-xs">{t('paperAnalysis.supportedFormats')}</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </div>

              {/* File List */}
              {uploadedFiles.length > 0 && (
                <div className="mt-4 space-y-2">
                  <p className="text-xs text-gray-500 uppercase tracking-wider">
                    {uploadedFiles.length} {t('app.upload')}
                  </p>
                  {uploadedFiles.map((file, i) => (
                    <motion.div
                      key={`${file.name}-${i}`}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/10"
                    >
                      <div className="flex items-center gap-3">
                        {file.type.includes('pdf') ? (
                          <HiOutlineDocumentText className="text-red-400" size={20} />
                        ) : (
                          <HiOutlinePhotograph className="text-green-400" size={20} />
                        )}
                        <div>
                          <p className="text-sm text-gray-300 truncate max-w-[200px]">{file.name}</p>
                          <p className="text-xs text-gray-500">{(file.size / 1024 / 1024).toFixed(1)} MB</p>
                        </div>
                      </div>
                      <button
                        onClick={() => removeFile(i)}
                        className="p-1.5 rounded-lg hover:bg-red-500/10 text-gray-500 hover:text-red-400 transition-all"
                      >
                        <HiOutlineX size={16} />
                      </button>
                    </motion.div>
                  ))}
                </div>
              )}
            </AnimatedCard>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Action Buttons */}
      {(capturedImage || uploadedFiles.length > 0) && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
          <AnimatedCard glow="green">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white text-sm font-medium">
                  {capturedImage ? '📸 1 ' + t('paperAnalysis.scanPaper') + ' • ' : ''}
                  {uploadedFiles.length > 0 ? `📄 ${uploadedFiles.length} ${t('app.upload')}` : ''}
                </p>
              </div>
              <motion.button
                onClick={processPapers}
                disabled={processing}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-cyan-600 text-white text-sm font-medium hover:shadow-lg disabled:opacity-50 transition-all"
              >
                {processing ? (
                  <span className="flex items-center gap-2">
                    <motion.div
                      className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full"
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                    />
                    {t('paperAnalysis.uploadProgress', { current: processProgress.current, total: processProgress.total })}
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <HiOutlineSparkles size={16} />
                    {t('paperAnalysis.analyzing')}
                  </span>
                )}
              </motion.button>
            </div>

            {/* Progress Bar */}
            {processing && (
              <div className="mt-3">
                <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden">
                  <motion.div
                    className="h-full rounded-full bg-gradient-to-r from-purple-500 to-cyan-500"
                    initial={{ width: 0 }}
                    animate={{ width: `${(processProgress.current / processProgress.total) * 100}%` }}
                    transition={{ duration: 0.5 }}
                  />
                </div>
              </div>
            )}
          </AnimatedCard>
        </motion.div>
      )}

      {/* Results Section */}
      {analysisResults.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <HiOutlineEye className="text-green-400" />
            {t('paperAnalysis.title')} — {t('paperAnalysis.completed')}
          </h2>

          {analysisResults.map((result, i) => (
            <PaperResultCard
              key={i}
              result={result}
              students={students}
              index={i}
            />
          ))}
        </div>
      )}

      {/* Empty State */}
      {!capturedImage && uploadedFiles.length === 0 && analysisResults.length === 0 && (
        <div className="text-center py-16">
          <HiOutlineDocumentText className="mx-auto text-gray-600 mb-4" size={48} />
          <p className="text-gray-400">{t('paperAnalysis.noPapers')}</p>
          <p className="text-gray-500 text-sm mt-1">{t('paperAnalysis.noPapersDesc')}</p>
        </div>
      )}

      {/* Hidden canvas for photo capture */}
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}

// Paper Result Card Component
function PaperResultCard({ result, students, index }) {
  const { t } = useTranslation();
  const [showStudentSelect, setShowStudentSelect] = useState(false);
  const [confirmedStudent, setConfirmedStudent] = useState(null);
  const [selectedStudentId, setSelectedStudentId] = useState('');

  if (result.error) {
    return (
      <AnimatedCard glow="red">
        <div className="flex items-center gap-3">
          <HiOutlineExclamation className="text-red-400" size={24} />
          <div>
            <p className="text-white font-medium">{result.name}</p>
            <p className="text-red-400 text-sm">{result.message}</p>
          </div>
        </div>
      </AnimatedCard>
    );
  }

  const analysis = result.analysis || {};
  const studentName = analysis.student_name || 'Unknown';
  const confidence = (analysis.confidence || 0) * 100;
  const needsConfirmation = confidence < 85 || !analysis.student_name || analysis.student_name === 'Unknown';

  const handleConfirmStudent = () => {
    const student = students.find((s) => s.id === parseInt(selectedStudentId));
    if (student) {
      setConfirmedStudent(student);
      setShowStudentSelect(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
    >
      <AnimatedCard glow={needsConfirmation ? 'yellow' : 'green'}>
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl bg-gradient-to-br flex items-center justify-center ${
              needsConfirmation ? 'from-yellow-500 to-orange-500' : 'from-green-500 to-emerald-500'
            }`}>
              {needsConfirmation ? (
                <HiOutlineExclamation className="text-white" size={20} />
              ) : (
                <HiOutlineCheck className="text-white" size={20} />
              )}
            </div>
            <div>
              <p className="text-white font-medium">
                {confirmedStudent ? confirmedStudent.name : studentName}
              </p>
              <p className="text-xs text-gray-400">
                {t('paperAnalysis.matchingConfidence')}: {confidence.toFixed(1)}%
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-lg font-bold text-white">
              {result.result?.score || 0}/{result.result?.total_marks || 0}
            </p>
            <p className="text-xs text-gray-400">{t('paperAnalysis.score')}</p>
          </div>
        </div>

        {/* Student Confirmation */}
        {needsConfirmation && !confirmedStudent && (
          <div className="p-3 rounded-lg bg-yellow-500/5 border border-yellow-500/20 mb-3">
            <p className="text-yellow-400 text-xs font-medium mb-2 flex items-center gap-1">
              <HiOutlineExclamation size={14} />
              {t('paperAnalysis.confirmStudent')}
            </p>
            {showStudentSelect ? (
              <div className="flex gap-2">
                <select
                  value={selectedStudentId}
                  onChange={(e) => setSelectedStudentId(e.target.value)}
                  className="flex-1 bg-white/5 border border-yellow-500/30 rounded-lg px-3 py-1.5 text-white text-xs focus:outline-none"
                >
                  <option value="" className="bg-gray-900">{t('paperAnalysis.selectStudent')}</option>
                  {students.map((s) => (
                    <option key={s.id} value={s.id} className="bg-gray-900">{s.name} ({s.roll_number})</option>
                  ))}
                </select>
                <button
                  onClick={handleConfirmStudent}
                  disabled={!selectedStudentId}
                  className="px-3 py-1.5 rounded-lg bg-yellow-500/20 text-yellow-400 text-xs hover:bg-yellow-500/30 disabled:opacity-50 transition-all"
                >
                  {t('app.confirm')}
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowStudentSelect(true)}
                className="text-yellow-400 text-xs hover:text-yellow-300 underline"
              >
                {t('paperAnalysis.selectStudent')}
              </button>
            )}
          </div>
        )}

        {/* Score Breakdown */}
        {result.result?.answers_data?.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs text-gray-500 uppercase tracking-wider">{t('analytics.score')} Breakdown</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <div className="p-2 rounded-lg bg-green-500/10 border border-green-500/20 text-center">
                <p className="text-lg font-bold text-green-400">
                  {result.result.answers_data.filter((a) => a.is_correct).length}
                </p>
                <p className="text-xs text-gray-500">{t('paperAnalysis.correctAnswers')}</p>
              </div>
              <div className="p-2 rounded-lg bg-red-500/10 border border-red-500/20 text-center">
                <p className="text-lg font-bold text-red-400">
                  {result.result.answers_data.filter((a) => !a.is_correct).length}
                </p>
                <p className="text-xs text-gray-500">{t('paperAnalysis.incorrectAnswers')}</p>
              </div>
              <div className="p-2 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-center">
                <p className="text-lg font-bold text-cyan-400">{result.result.percentage}%</p>
                <p className="text-xs text-gray-500">{t('paperAnalysis.score')}</p>
              </div>
              <div className="p-2 rounded-lg bg-purple-500/10 border border-purple-500/20 text-center">
                <p className="text-lg font-bold text-purple-400">{analysis.confidence ? (analysis.confidence * 100).toFixed(0) : 'N/A'}%</p>
                <p className="text-xs text-gray-500">{t('paperAnalysis.confidence')}</p>
              </div>
            </div>
          </div>
        )}
      </AnimatedCard>
    </motion.div>
  );
}
