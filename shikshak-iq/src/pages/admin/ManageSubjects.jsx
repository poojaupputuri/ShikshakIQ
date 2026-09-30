import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { adminAPI } from '../../services/api';
import AnimatedCard from '../../components/AnimatedCard';
import { PageLoader } from '../../components/LoadingScreen';
import { HiOutlinePlus, HiOutlineTrash, HiOutlinePencil, HiOutlineClipboardList } from 'react-icons/hi';

export default function ManageSubjects() {
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: '', code: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchSubjects();
  }, []);

  const fetchSubjects = async () => {
    try {
      const res = await adminAPI.getSubjects();
      setSubjects(res.data.subjects || []);
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
        await adminAPI.updateSubject(editing.id, form);
      } else {
        await adminAPI.createSubject(form);
      }
      setShowForm(false);
      setEditing(null);
      setForm({ name: '', code: '' });
      fetchSubjects();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to save subject');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (subject) => {
    setEditing(subject);
    setForm({ name: subject.name, code: subject.code || '' });
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this subject? All assignments with this subject will be removed.')) return;
    try {
      await adminAPI.deleteSubject(id);
      fetchSubjects();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to delete');
    }
  };

  if (loading) return <PageLoader />;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <HiOutlineClipboardList className="text-purple-400" />
            Manage Subjects
          </h1>
          <p className="text-gray-400 text-sm mt-1">{subjects.length} subjects</p>
        </div>
        <motion.button
          onClick={() => { setShowForm(true); setEditing(null); setForm({ name: '', code: '' }); }}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-cyan-600 text-white text-sm font-medium"
        >
          <HiOutlinePlus size={16} /> Add Subject
        </motion.button>
      </div>

      <AnimatePresence>
        {showForm && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
            <AnimatedCard className="mb-6">
              <h2 className="text-lg font-semibold text-white mb-4">
                {editing ? 'Edit Subject' : 'Create New Subject'}
              </h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-300 mb-1.5">Subject Name *</label>
                    <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                      placeholder="e.g., Mathematics"
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white text-sm input-glow" required />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-300 mb-1.5">Code</label>
                    <input type="text" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })}
                      placeholder="e.g., MATH"
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white text-sm input-glow" />
                  </div>
                </div>
                <div className="flex gap-3">
                  <button type="button" onClick={() => { setShowForm(false); setEditing(null); }}
                    className="px-4 py-2 rounded-lg border border-white/10 text-sm text-gray-300 hover:bg-white/5">Cancel</button>
                  <button type="submit" disabled={saving}
                    className="px-4 py-2 rounded-lg bg-purple-500/20 text-purple-400 text-sm hover:bg-purple-500/30 disabled:opacity-50">
                    {saving ? 'Saving...' : editing ? 'Update Subject' : 'Create Subject'}
                  </button>
                </div>
              </form>
            </AnimatedCard>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {subjects.map((subject, i) => (
          <motion.div key={subject.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
            <AnimatedCard>
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-white font-semibold">{subject.name}</p>
                  {subject.code && <p className="text-gray-400 text-xs mt-1">Code: {subject.code}</p>}
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => handleEdit(subject)}
                    className="p-2 rounded-lg text-gray-400 hover:text-cyan-400 hover:bg-white/5 transition-all">
                    <HiOutlinePencil size={14} />
                  </button>
                  <button onClick={() => handleDelete(subject.id)}
                    className="p-2 rounded-lg text-gray-400 hover:text-red-400 hover:bg-white/5 transition-all">
                    <HiOutlineTrash size={14} />
                  </button>
                </div>
              </div>
            </AnimatedCard>
          </motion.div>
        ))}
        {subjects.length === 0 && (
          <div className="col-span-full text-center py-16 text-gray-500">
            <HiOutlineClipboardList className="mx-auto mb-4" size={48} />
            <p>No subjects created yet</p>
          </div>
        )}
      </div>
    </div>
  );
}
