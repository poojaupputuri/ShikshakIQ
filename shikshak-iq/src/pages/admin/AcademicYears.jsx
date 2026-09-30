import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { adminAPI } from '../../services/api';
import AnimatedCard from '../../components/AnimatedCard';
import { PageLoader } from '../../components/LoadingScreen';
import { HiOutlinePlus, HiOutlineCog, HiOutlineCheckCircle } from 'react-icons/hi';

export default function AcademicYears() {
  const [years, setYears] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', start_date: '', end_date: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchYears();
  }, []);

  const fetchYears = async () => {
    try {
      const res = await adminAPI.getAcademicYears();
      setYears(res.data.academic_years || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await adminAPI.createAcademicYear(form);
      setShowForm(false);
      setForm({ name: '', start_date: '', end_date: '' });
      fetchYears();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to create');
    } finally {
      setSaving(false);
    }
  };

  const handleActivate = async (id) => {
    try {
      await adminAPI.activateAcademicYear(id);
      fetchYears();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to activate');
    }
  };

  if (loading) return <PageLoader />;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <HiOutlineCog className="text-purple-400" />
            Academic Years
          </h1>
          <p className="text-gray-400 text-sm mt-1">{years.length} years configured</p>
        </div>
        <motion.button
          onClick={() => setShowForm(!showForm)}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-cyan-600 text-white text-sm font-medium"
        >
          <HiOutlinePlus size={16} />
          Add Year
        </motion.button>
      </div>

      {showForm && (
        <AnimatedCard className="mb-6">
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm text-gray-300 mb-1.5">Year Name *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g., 2026-2027"
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none input-glow"
                  required
                />
              </div>
              <div>
                <label className="block text-sm text-gray-300 mb-1.5">Start Date</label>
                <input
                  type="date"
                  value={form.start_date}
                  onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none input-glow"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-300 mb-1.5">End Date</label>
                <input
                  type="date"
                  value={form.end_date}
                  onChange={(e) => setForm({ ...form, end_date: e.target.value })}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none input-glow"
                />
              </div>
            </div>
            <div className="flex gap-3">
              <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 rounded-lg border border-white/10 text-sm text-gray-300 hover:bg-white/5 transition-all">Cancel</button>
              <button type="submit" disabled={saving} className="px-4 py-2 rounded-lg bg-purple-500/20 text-purple-400 text-sm hover:bg-purple-500/30 transition-all disabled:opacity-50">
                {saving ? 'Creating...' : 'Create Year'}
              </button>
            </div>
          </form>
        </AnimatedCard>
      )}

      <div className="space-y-3">
        {years.map((year, i) => (
          <motion.div
            key={year.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
          >
            <AnimatedCard glow={year.is_active ? 'green' : ''}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {year.is_active && (
                    <HiOutlineCheckCircle className="text-green-400" size={20} />
                  )}
                  <div>
                    <p className="text-white font-medium">{year.name}</p>
                    <p className="text-gray-400 text-xs">
                      {year.start_date ? `Start: ${year.start_date}` : 'No start date'}
                      {year.end_date ? ` • End: ${year.end_date}` : ''}
                    </p>
                  </div>
                </div>
                {!year.is_active ? (
                  <button
                    onClick={() => handleActivate(year.id)}
                    className="px-3 py-1.5 rounded-lg bg-green-500/20 text-green-400 text-xs hover:bg-green-500/30 transition-all"
                  >
                    Activate
                  </button>
                ) : (
                  <span className="px-3 py-1.5 rounded-lg bg-green-500/20 text-green-400 text-xs">
                    Active
                  </span>
                )}
              </div>
            </AnimatedCard>
          </motion.div>
        ))}
        {years.length === 0 && (
          <div className="text-center py-16 text-gray-500">
            <HiOutlineCog className="mx-auto mb-4" size={48} />
            <p>No academic years configured yet</p>
          </div>
        )}
      </div>
    </div>
  );
}
