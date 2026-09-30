import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { adminAPI } from '../../services/api';
import AnimatedCard from '../../components/AnimatedCard';
import { PageLoader } from '../../components/LoadingScreen';
import {
  HiOutlinePlus, HiOutlineTrash, HiOutlinePencil, HiOutlineUser,
  HiOutlineMail, HiOutlinePhone, HiOutlineAcademicCap,
} from 'react-icons/hi';

export default function ManageTeachers() {
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({
    name: '', email: '', password: 'Teacher@123',
    phone: '', subject_specialization: '',
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchTeachers();
  }, []);

  const fetchTeachers = async () => {
    try {
      const res = await adminAPI.getTeachers();
      setTeachers(res.data.teachers || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editing) {
        await adminAPI.updateTeacher(editing.id, form);
      } else {
        await adminAPI.createTeacher(form);
      }
      setShowForm(false);
      setEditing(null);
      setForm({ name: '', email: '', password: 'Teacher@123', phone: '', subject_specialization: '' });
      fetchTeachers();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to save teacher');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (teacher) => {
    setEditing(teacher);
    setForm({
      name: teacher.name,
      email: teacher.email,
      password: '',
      phone: teacher.phone || '',
      subject_specialization: teacher.subject_specialization || '',
    });
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this teacher? Their assignments will also be removed.')) return;
    try {
      await adminAPI.deleteTeacher(id);
      fetchTeachers();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to delete');
    }
  };

  const handleToggleActive = async (teacher) => {
    try {
      await adminAPI.updateTeacher(teacher.id, { is_active: !teacher.is_active });
      fetchTeachers();
    } catch (err) {
      alert('Failed to update status');
    }
  };

  if (loading) return <PageLoader />;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <HiOutlineUser className="text-purple-400" />
            Manage Teachers
          </h1>
          <p className="text-gray-400 text-sm mt-1">{teachers.length} teachers</p>
        </div>
        <motion.button
          onClick={() => { setShowForm(true); setEditing(null); setForm({ name: '', email: '', password: 'Teacher@123', phone: '', subject_specialization: '' }); }}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-cyan-600 text-white text-sm font-medium"
        >
          <HiOutlinePlus size={16} />
          Add Teacher
        </motion.button>
      </div>

      <AnimatePresence>
        {showForm && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
            <AnimatedCard className="mb-6">
              <h2 className="text-lg font-semibold text-white mb-4">
                {editing ? 'Edit Teacher' : 'Create New Teacher'}
              </h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-300 mb-1.5">Name *</label>
                    <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white text-sm input-glow" required />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-300 mb-1.5">Email *</label>
                    <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white text-sm input-glow" required />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-300 mb-1.5">
                      Password {editing ? '(leave blank to keep)' : '*'}
                    </label>
                    <input type="text" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })}
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white text-sm input-glow"
                      required={!editing} />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-300 mb-1.5">Phone</label>
                    <input type="text" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })}
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white text-sm input-glow" />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-300 mb-1.5">Subject Specialization</label>
                    <input type="text" value={form.subject_specialization} onChange={(e) => setForm({ ...form, subject_specialization: e.target.value })}
                      placeholder="e.g., Mathematics, Science"
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white text-sm input-glow" />
                  </div>
                </div>
                <div className="flex gap-3">
                  <button type="button" onClick={() => { setShowForm(false); setEditing(null); }}
                    className="px-4 py-2 rounded-lg border border-white/10 text-sm text-gray-300 hover:bg-white/5">Cancel</button>
                  <button type="submit" disabled={saving}
                    className="px-4 py-2 rounded-lg bg-purple-500/20 text-purple-400 text-sm hover:bg-purple-500/30 disabled:opacity-50">
                    {saving ? 'Saving...' : editing ? 'Update Teacher' : 'Create Teacher'}
                  </button>
                </div>
              </form>
            </AnimatedCard>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="space-y-3">
        {teachers.map((teacher, i) => (
          <motion.div key={teacher.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
            <AnimatedCard>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                    <span className="text-white font-bold text-sm">{teacher.name?.charAt(0)}</span>
                  </div>
                  <div>
                    <p className="text-white font-medium flex items-center gap-2">
                      {teacher.name}
                      {!teacher.is_active && (
                        <span className="px-2 py-0.5 rounded bg-red-500/20 text-red-400 text-[10px]">Inactive</span>
                      )}
                    </p>
                    <p className="text-gray-400 text-xs flex items-center gap-3">
                      <span className="flex items-center gap-1"><HiOutlineMail size={12} /> {teacher.email}</span>
                      {teacher.phone && <span className="flex items-center gap-1"><HiOutlinePhone size={12} /> {teacher.phone}</span>}
                      {teacher.subject_specialization && (
                        <span className="flex items-center gap-1"><HiOutlineAcademicCap size={12} /> {teacher.subject_specialization}</span>
                      )}
                    </p>
                    {teacher.assignments_count > 0 && (
                      <p className="text-purple-400 text-xs mt-1">
                        {teacher.assignments_count} assignment(s)
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => handleToggleActive(teacher)}
                    className={`px-3 py-1.5 rounded-lg text-xs transition-all ${
                      teacher.is_active
                        ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
                        : 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
                    }`}>
                    {teacher.is_active ? 'Deactivate' : 'Activate'}
                  </button>
                  <button onClick={() => handleEdit(teacher)}
                    className="p-2 rounded-lg text-gray-400 hover:text-cyan-400 hover:bg-white/5 transition-all">
                    <HiOutlinePencil size={16} />
                  </button>
                  <button onClick={() => handleDelete(teacher.id)}
                    className="p-2 rounded-lg text-gray-400 hover:text-red-400 hover:bg-white/5 transition-all">
                    <HiOutlineTrash size={16} />
                  </button>
                </div>
              </div>
            </AnimatedCard>
          </motion.div>
        ))}
        {teachers.length === 0 && (
          <div className="text-center py-16 text-gray-500">
            <HiOutlineUser className="mx-auto mb-4" size={48} />
            <p>No teachers created yet</p>
          </div>
        )}
      </div>
    </div>
  );
}
