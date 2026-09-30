import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { adminAPI } from '../../services/api';
import AnimatedCard from '../../components/AnimatedCard';
import { PageLoader } from '../../components/LoadingScreen';
import { HiOutlinePlus, HiOutlineTrash, HiOutlineSwitchHorizontal } from 'react-icons/hi';

export default function ManageAssignments() {
  const [assignments, setAssignments] = useState([]);
  const [structure, setStructure] = useState({ teachers: [], classes: [], subjects: [], academic_years: [] });
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ teacher_id: '', class_id: '', subject_id: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [assignRes, structRes] = await Promise.all([
        adminAPI.getAssignments(),
        adminAPI.getStructure(),
      ]);
      setAssignments(assignRes.data.assignments || []);
      setStructure(structRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.teacher_id || !form.class_id || !form.subject_id) {
      alert('Please select teacher, class, and subject');
      return;
    }
    setSaving(true);
    try {
      await adminAPI.createAssignment(form);
      setShowForm(false);
      setForm({ teacher_id: '', class_id: '', subject_id: '' });
      fetchData();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to create assignment');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Remove this assignment?')) return;
    try {
      await adminAPI.deleteAssignment(id);
      fetchData();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to remove');
    }
  };

  const findName = (type, id) => {
    if (type === 'teachers') return structure.teachers.find(t => t.id === id)?.name || 'Unknown';
    if (type === 'classes') return structure.classes.find(c => c.id === id)?.display_name || 'Unknown';
    if (type === 'subjects') return structure.subjects.find(s => s.id === id)?.name || 'Unknown';
    return 'Unknown';
  };

  if (loading) return <PageLoader />;

  const hasStructureData = structure.teachers.length > 0 && structure.classes.length > 0 && structure.subjects.length > 0;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <HiOutlineSwitchHorizontal className="text-purple-400" />
            Teacher Assignments
          </h1>
          <p className="text-gray-400 text-sm mt-1">{assignments.length} assignments</p>
        </div>
        {hasStructureData && (
          <motion.button
            onClick={() => setShowForm(!showForm)}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-cyan-600 text-white text-sm font-medium"
          >
            <HiOutlinePlus size={16} />
            New Assignment
          </motion.button>
        )}
      </div>

      {!hasStructureData && (
        <div className="text-center py-16 text-gray-500">
          <HiOutlineSwitchHorizontal className="mx-auto mb-4" size={48} />
          <p className="mb-2">Create teachers, classes, and subjects first</p>
          <p className="text-xs text-gray-600">Then come back to assign them</p>
        </div>
      )}

      {showForm && hasStructureData && (
        <AnimatedCard className="mb-6" glow="purple">
          <h2 className="text-lg font-semibold text-white mb-4">Assign Teacher to Class & Subject</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm text-gray-300 mb-1.5">Teacher *</label>
                <select value={form.teacher_id} onChange={(e) => setForm({ ...form, teacher_id: parseInt(e.target.value) })}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white text-sm input-glow" required>
                  <option value="" className="bg-gray-900">Select teacher...</option>
                  {structure.teachers.map(t => (
                    <option key={t.id} value={t.id} className="bg-gray-900">{t.name} ({t.subject_specialization || 'No specialization'})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-300 mb-1.5">Class *</label>
                <select value={form.class_id} onChange={(e) => setForm({ ...form, class_id: parseInt(e.target.value) })}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white text-sm input-glow" required>
                  <option value="" className="bg-gray-900">Select class...</option>
                  {structure.classes.map(c => (
                    <option key={c.id} value={c.id} className="bg-gray-900">{c.display_name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-300 mb-1.5">Subject *</label>
                <select value={form.subject_id} onChange={(e) => setForm({ ...form, subject_id: parseInt(e.target.value) })}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white text-sm input-glow" required>
                  <option value="" className="bg-gray-900">Select subject...</option>
                  {structure.subjects.map(s => (
                    <option key={s.id} value={s.id} className="bg-gray-900">{s.name}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex gap-3">
              <button type="button" onClick={() => setShowForm(false)}
                className="px-4 py-2 rounded-lg border border-white/10 text-sm text-gray-300 hover:bg-white/5">Cancel</button>
              <button type="submit" disabled={saving}
                className="px-4 py-2 rounded-lg bg-purple-500/20 text-purple-400 text-sm hover:bg-purple-500/30 disabled:opacity-50">
                {saving ? 'Creating...' : 'Create Assignment'}
              </button>
            </div>
          </form>
        </AnimatedCard>
      )}

      {/* Assignments List grouped by teacher */}
      <div className="space-y-4">
        {structure.teachers.map(teacher => {
          const teacherAssignments = assignments.filter(a => a.teacher_id === teacher.id);
          if (teacherAssignments.length === 0) return null;
          return (
            <motion.div key={teacher.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <AnimatedCard>
                <div className="mb-3">
                  <p className="text-white font-medium">{teacher.name}</p>
                  <p className="text-gray-400 text-xs">{teacherAssignments.length} assignment(s)</p>
                </div>
                <div className="space-y-2">
                  {teacherAssignments.map(assignment => (
                    <div key={assignment.id} className="flex items-center justify-between p-3 rounded-lg bg-white/5">
                      <div className="flex items-center gap-3">
                        <span className="text-sm text-white">{assignment.class_name}</span>
                        <span className="text-gray-600">→</span>
                        <span className="text-sm text-cyan-400">{assignment.subject_name}</span>
                        {assignment.academic_year && (
                          <span className="text-xs text-gray-500">({assignment.academic_year})</span>
                        )}
                      </div>
                      <button onClick={() => handleDelete(assignment.id)}
                        className="p-2 rounded-lg text-gray-400 hover:text-red-400 transition-all">
                        <HiOutlineTrash size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              </AnimatedCard>
            </motion.div>
          );
        })}

        {assignments.length === 0 && hasStructureData && (
          <div className="text-center py-16 text-gray-500">
            <HiOutlineSwitchHorizontal className="mx-auto mb-4" size={48} />
            <p>No assignments created yet</p>
          </div>
        )}
      </div>
    </div>
  );
}
