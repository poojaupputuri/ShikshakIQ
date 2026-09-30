import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import AnimatedCard from '../components/AnimatedCard';
import { PageLoader } from '../components/LoadingScreen';
import { studentAPI } from '../services/api';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import {
  HiOutlineUserAdd,
  HiOutlinePencil,
  HiOutlineTrash,
  HiOutlineUpload,
  HiOutlineSearch,
  HiOutlineX,
  HiOutlineUsers,
  HiOutlineDownload,
} from 'react-icons/hi';

export default function Students() {
  const { t } = useTranslation();
  const { user, activeWorkspace } = useAuth();
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingStudent, setEditingStudent] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    roll_number: '',
    class_name: '',
    section: 'A',
    parent_name: '',
    parent_phone: '',
    parent_email: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef();

  useEffect(() => {
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
    } finally {
      setLoading(false);
    }
  };

  const openAddModal = () => {
    setEditingStudent(null);
    setFormData({
      name: '',
      roll_number: '',
      class_name: activeWorkspace?.class_name || '',
      section: 'A',
      parent_name: '',
      parent_phone: '',
      parent_email: '',
    });
    setError('');
    setShowModal(true);
  };

  const openEditModal = (student) => {
    setEditingStudent(student);
    setFormData({
      name: student.name,
      roll_number: student.roll_number,
      class_name: student.class_name,
      section: student.section,
      parent_name: student.parent_name || '',
      parent_phone: student.parent_phone || '',
      parent_email: student.parent_email || '',
    });
    setError('');
    setShowModal(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');

    try {
      if (editingStudent) {
        await studentAPI.update(editingStudent.id, formData);
      } else {
        await studentAPI.create(formData);
      }
      setShowModal(false);
      fetchStudents();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save student');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Delete ${name}? This action cannot be undone.`)) return;
    try {
      await studentAPI.delete(id);
      fetchStudents();
    } catch (err) {
      console.error('Delete error:', err);
    }
  };

  const handleCSVImport = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await studentAPI.importCSV(formData);
      alert(res.data.message);
      fetchStudents();
    } catch (err) {
      alert(err.response?.data?.error || 'Import failed');
    }
    e.target.value = '';
  };

  const filteredStudents = students.filter(
    (s) =>
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.roll_number.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <PageLoader />;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8"
      >
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <HiOutlineUsers className="text-purple-400" />
            {t('students.title')}
          </h1>
          <p className="text-gray-400 text-sm mt-1">
            {activeWorkspace ? `${activeWorkspace.class_name} • ${activeWorkspace.subject_name}` : ''} • {students.length} {t('students.title').toLowerCase()}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <input
            type="file"
            ref={fileInputRef}
            accept=".csv"
            onChange={handleCSVImport}
            className="hidden"
          />
          <motion.button
            onClick={() => fileInputRef.current?.click()}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-white/10 text-sm text-gray-300 hover:bg-white/5 transition-all"
          >
            <HiOutlineDownload size={16} />
            {t('students.importCSV')}
          </motion.button>
          <motion.button
            onClick={openAddModal}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-cyan-600 text-white text-sm font-medium hover:shadow-lg hover:shadow-purple-500/25 transition-all"
          >
            <HiOutlineUserAdd size={16} />
            {t('students.addStudent')}
          </motion.button>
        </div>
      </motion.div>

      {/* Search */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="glass rounded-xl p-4 mb-6"
      >
        <div className="relative">
          <HiOutlineSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('students.search')}
            className="w-full bg-white/5 border border-white/10 rounded-lg py-2.5 pl-10 pr-4 text-white placeholder-gray-500 focus:outline-none input-glow text-sm"
          />
        </div>
      </motion.div>

      {/* Students Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <AnimatePresence>
          {filteredStudents.map((student, i) => (
            <motion.div
              key={student.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ delay: i * 0.05 }}
              layout
            >
              <AnimatedCard glow="purple" className="h-full">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                      <span className="text-white font-bold text-sm">
                        {student.name?.charAt(0)}
                      </span>
                    </div>
                    <div>
                      <h3 className="text-white font-medium text-sm">{student.name}</h3>
                      <p className="text-gray-400 text-xs">Roll: {student.roll_number}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => openEditModal(student)}
                      className="p-2 rounded-lg hover:bg-white/5 text-gray-400 hover:text-cyan-400 transition-all"
                    >
                      <HiOutlinePencil size={16} />
                    </button>
                    <button
                      onClick={() => handleDelete(student.id, student.name)}
                      className="p-2 rounded-lg hover:bg-white/5 text-gray-400 hover:text-red-400 transition-all"
                    >
                      <HiOutlineTrash size={16} />
                    </button>
                  </div>
                </div>
                <div className="space-y-1.5 text-xs text-gray-400">
                  <p>Class: {student.class_name} • Section: {student.section}</p>
                  {student.parent_name && <p>Parent: {student.parent_name}</p>}
                  {student.parent_phone && <p>Phone: {student.parent_phone}</p>}
                </div>
              </AnimatedCard>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {filteredStudents.length === 0 && (
        <div className="text-center py-16">
          <HiOutlineUsers className="mx-auto text-gray-600 mb-4" size={48} />              <p className="text-gray-400">{t('students.noStudents')}</p>
              <button
                onClick={openAddModal}
                className="mt-4 px-4 py-2 rounded-xl bg-purple-500/20 text-purple-400 text-sm hover:bg-purple-500/30 transition-all"
              >
                {t('students.addFirst')}
              </button>
        </div>
      )}

      {/* Add/Edit Modal */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="glass rounded-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-white">
                  {editingStudent ? t('students.editStudent') : t('students.addNew')}
                </h2>
                <button
                  onClick={() => setShowModal(false)}
                  className="p-2 rounded-lg hover:bg-white/5 text-gray-400 hover:text-white transition-all"
                >
                  <HiOutlineX size={20} />
                </button>
              </div>

              <form onSubmit={handleSave} className="space-y-4">
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

                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-sm text-gray-300 mb-1.5">{t('students.fullName')} *</label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none input-glow"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-300 mb-1.5">{t('students.rollNumber')} *</label>
                    <input
                      type="text"
                      value={formData.roll_number}
                      onChange={(e) => setFormData({ ...formData, roll_number: e.target.value })}
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none input-glow"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-300 mb-1.5">Class</label>
                    <select
                      value={formData.class_name}
                      onChange={(e) => setFormData({ ...formData, class_name: e.target.value })}
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none input-glow"
                    >
                      {['Class 6', 'Class 7', 'Class 8', 'Class 9', 'Class 10'].map((c) => (
                        <option key={c} value={c} className="bg-gray-900">{c}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm text-gray-300 mb-1.5">Section</label>
                    <select
                      value={formData.section}
                      onChange={(e) => setFormData({ ...formData, section: e.target.value })}
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none input-glow"
                    >
                      {['A', 'B', 'C'].map((s) => (
                        <option key={s} value={s} className="bg-gray-900">{s}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="border-t border-white/10 pt-4">                    <p className="text-xs text-gray-500 uppercase tracking-wider mb-3">{t('students.parentDetails')}</p>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm text-gray-300 mb-1.5">{t('students.parentName')}</label>
                      <input
                        type="text"
                        value={formData.parent_name}
                        onChange={(e) => setFormData({ ...formData, parent_name: e.target.value })}
                        className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none input-glow"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-300 mb-1.5">{t('students.phone')}</label>
                      <input
                        type="text"
                        value={formData.parent_phone}
                        onChange={(e) => setFormData({ ...formData, parent_phone: e.target.value })}
                        className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none input-glow"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-sm text-gray-300 mb-1.5">{t('students.email')}</label>
                      <input
                        type="email"
                        value={formData.parent_email}
                        onChange={(e) => setFormData({ ...formData, parent_email: e.target.value })}
                        className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none input-glow"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="flex-1 py-2.5 rounded-xl border border-white/10 text-sm text-gray-300 hover:bg-white/5 transition-all"
                  >
                    {t('students.cancel')}
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-cyan-600 text-white text-sm font-medium hover:shadow-lg hover:shadow-purple-500/25 transition-all disabled:opacity-50"
                  >
                    {saving ? t('students.saving') : editingStudent ? t('students.update') : t('students.addStudent')}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
