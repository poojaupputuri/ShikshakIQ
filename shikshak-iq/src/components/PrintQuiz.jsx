import { useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { HiOutlineX, HiOutlinePrinter, HiOutlineDownload } from 'react-icons/hi';

export default function PrintQuiz({ data, onClose }) {
  const printRef = useRef(null);

  useEffect(() => {
    // Add print-specific styles
    const styleId = 'print-quiz-styles';
    if (!document.getElementById(styleId)) {
      const style = document.createElement('style');
      style.id = styleId;
      style.textContent = `
        @media print {
          @page { margin: 20mm 15mm; size: A4; }
          body { background: white !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .no-print { display: none !important; }
          .print-only { display: block !important; }
          .print-quiz-container {
            font-family: 'Times New Roman', Times, serif !important;
            color: black !important;
            background: white !important;
            padding: 0 !important;
          }
          .print-quiz-container * { box-shadow: none !important; }
          .print-header {
            text-align: center;
            border-bottom: 2px solid #000;
            padding-bottom: 16px;
            margin-bottom: 24px;
          }
          .print-header h1 { font-size: 22pt; font-weight: bold; margin: 0 0 4px 0; color: #000; }
          .print-header .subtitle { font-size: 12pt; color: #333; margin: 2px 0; }
          .print-info-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 11pt; }
          .print-info-table td { padding: 4px 8px; border: 1px solid #000; }
          .print-info-table td:first-child { font-weight: bold; width: 30%; }
          .print-instructions {
            font-size: 10pt; margin-bottom: 20px; padding: 10px;
            border: 1px solid #000; background: #f9f9f9;
          }
          .print-instructions h3 { font-size: 11pt; margin: 0 0 6px 0; }
          .print-instructions ul { margin: 0; padding-left: 20px; }
          .print-instructions li { margin: 2px 0; }
          .print-question {
            margin-bottom: 16px; page-break-inside: avoid;
          }
          .print-question .q-header { font-size: 11pt; font-weight: bold; margin-bottom: 6px; }
          .print-question .q-text { font-size: 10.5pt; margin-bottom: 8px; line-height: 1.5; }
          .print-question .q-marks { float: right; font-size: 10pt; }
          .print-options { margin: 0 0 8px 16px; }
          .print-options li { font-size: 10.5pt; list-style: none; margin: 4px 0; }
          .print-answer-space { 
            min-height: 60px; border-bottom: 1px dashed #ccc; margin: 8px 0 16px 0; 
          }
          .print-footer { 
            text-align: center; font-size: 9pt; color: #666; 
            border-top: 1px solid #ccc; padding-top: 8px; margin-top: 24px;
          }
          .print-page-break { page-break-before: always; }
          .print-mcq-option {
            display: inline-block; margin: 2px 12px 2px 0;
          }
          .print-or { 
            text-align: center; font-weight: bold; font-size: 12pt; 
            margin: 20px 0; border-top: 1px dashed #000; padding-top: 20px;
          }
        }
        @media screen {
          .print-only { display: none; }
        }
      `;
      document.head.appendChild(style);
    }

    return () => {
      const style = document.getElementById(styleId);
      if (style) style.remove();
    };
  }, []);

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = () => {
    // Use print-to-PDF instruction
    alert('Click "Print" and select "Save as PDF" to download as a PDF file.');
    window.print();
  };

  const { quiz, school } = data;
  if (!quiz) return null;

  const formatDate = () => {
    const now = new Date();
    return now.toLocaleDateString('en-IN', {
      day: 'numeric', month: 'long', year: 'numeric'
    });
  };

  const groupedQuestions = (quiz.questions || []).reduce((acc, q) => {
    const type = q.question_type || 'short';
    if (!acc[type]) acc[type] = [];
    acc[type].push(q);
    return acc;
  }, {});

  const totalMarks = (quiz.questions || []).reduce((sum, q) => sum + (q.marks || 0), 0);

  return (
    <>
      {/* Toolbar — hidden when printing */}
      <div className="no-print fixed top-0 left-0 right-0 z-50 bg-gray-900/95 backdrop-blur-md border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <button onClick={onClose} className="flex items-center gap-2 text-gray-400 hover:text-white transition-all">
            <HiOutlineX size={20} />
            <span className="text-sm">Close Preview</span>
          </button>
          <div className="flex items-center gap-3">
            <div className="text-xs text-gray-500">
              {quiz.title} • {totalMarks} marks
            </div>
            <motion.button
              onClick={handleDownloadPDF}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="flex items-center gap-2 px-4 py-2 rounded-xl border border-white/10 text-sm text-gray-300 hover:bg-white/5"
            >
              <HiOutlineDownload size={16} />
              Save as PDF
            </motion.button>
            <motion.button
              onClick={handlePrint}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="flex items-center gap-2 px-5 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-cyan-600 text-white text-sm font-medium"
            >
              <HiOutlinePrinter size={16} />
              Print
            </motion.button>
          </div>
        </div>
      </div>

      {/* Print Content */}

      <div className="pt-16 no-print">
        <div className="max-w-[210mm] mx-auto">
          <div className="rounded-2xl bg-white/5 border border-white/10 p-8 mb-8">
            <div className="flex items-center justify-center mb-4">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500 to-cyan-500 flex items-center justify-center">
                <HiOutlinePrinter className="text-white" size={28} />
              </div>
            </div>
            <h2 className="text-xl font-bold text-white text-center mb-2">Question Paper Preview</h2>
            <p className="text-gray-400 text-sm text-center mb-6">
              The paper will print with proper exam formatting.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
              <div className="p-3 rounded-xl bg-white/5 border border-white/10 text-center">
                <p className="text-xs text-gray-500 mb-1">Total Marks</p>
                <p className="text-lg font-bold text-white">{totalMarks}</p>
              </div>
              <div className="p-3 rounded-xl bg-white/5 border border-white/10 text-center">
                <p className="text-xs text-gray-500 mb-1">Duration</p>
                <p className="text-lg font-bold text-white">{quiz.duration_minutes || 60} min</p>
              </div>
              <div className="p-3 rounded-xl bg-white/5 border border-white/10 text-center">
                <p className="text-xs text-gray-500 mb-1">Questions</p>
                <p className="text-lg font-bold text-white">{(quiz.questions || []).length}</p>
              </div>
            </div>

            <div className="flex justify-center gap-4">
              <button onClick={handlePrint}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-cyan-600 text-white text-sm font-medium">
                <span className="flex items-center gap-2"><HiOutlinePrinter size={16} /> Print Now</span>
              </button>
              <button onClick={handleDownloadPDF}
                className="px-6 py-2.5 rounded-xl border border-white/10 text-sm text-gray-300 hover:bg-white/5">
                <span className="flex items-center gap-2"><HiOutlineDownload size={16} /> Download PDF</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Printable Paper — hidden on screen, visible during print */}
      <div ref={printRef} className="print-quiz-container print-only">
        {/* School Header */}
        <div className="print-header">
          <h1>{school?.name || 'Shikshak International School'}</h1>
          <div className="subtitle">School Code: SIK024 • Affiliated to CBSE</div>
          <div className="subtitle" style={{ marginTop: 8, fontSize: '14pt', fontWeight: 'bold' }}>
            {quiz.title}
          </div>
        </div>

        {/* Info Table */}
        <table className="print-info-table">
          <tbody>
            <tr>
              <td>Class</td>
              <td>{quiz.class_name || '_______________'}</td>
              <td>Subject</td>
              <td>{quiz.subject || '_______________'}</td>
            </tr>
            <tr>
              <td>Total Marks</td>
              <td>{totalMarks}</td>
              <td>Duration</td>
              <td>{quiz.duration_minutes || 60} Minutes</td>
            </tr>
            <tr>
              <td>Date</td>
              <td>{formatDate()}</td>
              <td>Teacher</td>
              <td>{quiz.teacher_name || '_______________'}</td>
            </tr>
          </tbody>
        </table>

        {/* Instructions */}
        <div className="print-instructions">
          <h3>General Instructions:</h3>
          <ul>
            <li>All questions are compulsory.</li>
            <li>Read each question carefully before answering.</li>
            <li>Write your answers legibly in the space provided.</li>
            <li>Use blue or black ink pen only.</li>
            <li>Rough work should be done on the last page.</li>
          </ul>
        </div>

        {/* Student Info */}
        <div style={{ marginBottom: 16, fontSize: '11pt' }}>
          <table style={{ width: '100%' }}>
            <tbody>
              <tr>
                <td style={{ width: '50%' }}>
                  <strong>Student Name:</strong> ___________________________________
                </td>
                <td style={{ width: '25%' }}>
                  <strong>Roll No:</strong> _____________
                </td>
                <td style={{ width: '25%' }}>
                  <strong>Date:</strong> _____________
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <hr style={{ border: '1px solid #000', marginBottom: 16 }} />

        {/* Section Headers */}
        {Object.entries(groupedQuestions).map(([type, questions], si) => (
          <div key={type}>
            {si > 0 && <div className="print-page-break" />}
            <div style={{ fontSize: '12pt', fontWeight: 'bold', marginBottom: 12, textTransform: 'uppercase' }}>
              Section {String.fromCharCode(65 + si)}: {type === 'mcq' ? 'Multiple Choice Questions' : type === 'short' ? 'Short Answer Questions' : 'Descriptive Questions'}
              <span style={{ float: 'right', fontSize: '10pt', fontWeight: 'normal' }}>
                ({questions.reduce((s, q) => s + (q.marks || 0), 0)} marks)
              </span>
            </div>

            {questions.map((q, i) => (
              <div key={q.id || i} className="print-question">
                <div className="q-header">
                  <span>Q{si > 0 ? `${String.fromCharCode(65 + si)}${i + 1}` : i + 1}.</span>
                  <span className="q-marks">[{q.marks || 1} mark{(q.marks || 1) > 1 ? 's' : ''}]</span>
                </div>
                <div className="q-text" style={{ marginLeft: 16 }}>{q.question_text}</div>

                {q.question_type === 'mcq' && q.options && q.options.length > 0 && (
                  <ol className="print-options" style={{ listStyle: 'none', marginLeft: 16 }}>
                    {q.options.filter(o => o).map((opt, oi) => (
                      <li key={oi} className="print-mcq-option" style={{ marginBottom: 4 }}>
                        <span style={{ fontWeight: 'bold' }}>{String.fromCharCode(65 + oi)}.</span> {opt}
                      </li>
                    ))}
                  </ol>
                )}

                {(q.question_type === 'short' || q.question_type === 'descriptive') && (
                  <div className="print-answer-space" style={{
                    minHeight: q.question_type === 'descriptive' ? 100 : 60,
                    borderBottom: '1px dashed #999',
                    margin: '8px 0 12px 16px'
                  }} />
                )}
              </div>
            ))}
          </div>
        ))}

        {/* End of Paper */}
        <div style={{ textAlign: 'center', marginTop: 32, paddingTop: 16, borderTop: '2px solid #000' }}>
          <div style={{ fontSize: '11pt', fontWeight: 'bold' }}>— END OF QUESTION PAPER —</div>
          <div className="print-footer">
            <div>Generated by ShikshakIQ • AI-Powered Educational Intelligence Platform</div>
            <div style={{ marginTop: 4 }}>{school?.name || ''} • {formatDate()}</div>
          </div>
        </div>
      </div>
    </>
  );
}
