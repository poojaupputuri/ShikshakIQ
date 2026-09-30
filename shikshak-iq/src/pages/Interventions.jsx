import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import AnimatedCard from '../components/AnimatedCard';
import { PageLoader } from '../components/LoadingScreen';
import { interventionAPI } from '../services/api';
import {
  HiOutlineSupport,
  HiOutlinePlus,
  HiOutlineExclamation,
  HiOutlineCheck,
  HiOutlineClock,
  HiOutlineX,
  HiOutlineLightBulb,
  HiOutlineSparkles,
  HiOutlineTrash,
  HiOutlineFilter,
  HiOutlineSearch,
  HiOutlineUserCircle,
} from 'react-icons/hi';

const typeColors = {
  remediation: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  extra_practice: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
  tutoring: 'bg-pink-500/20 text-pink-400 border-pink-500/30',
  counseling: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  parent_meeting: 'bg-green-500/20 text-green-400 border-green-500/30',
};

const statusColors = {
  planned: 'bg-yellow-500/20 text-yellow-400',
  in_progress: 'bg-blue-500/20 text-blue-400',
  completed: 'bg-green-500/20 text-green-400',
  cancelled: 'bg-gray-500/20 text-gray-400',
};

const priorityColors = {
  low: 'text-gray-400',
  medium: 'text-yellow-400',
  high: 'text-orange-400',
  critical: 'text-red-400',
};

export default function Interventions() {
  const { user, activeWorkspace } = useAuth();
  const [interventions, setInterventions] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('list');
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');

  // Form state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [formData, setFormData] = useState({
    student_id: '',
    intervention_type: 'remediation',
    concept_name: '',
    description: '',
    priority: 'medium',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchInterventions();
    fetchSuggestions();
  }, [activeWorkspace]);

  const fetchInterventions = async () => {
    try {
      const params = {};
      if (activeWorkspace) params.assignment_id = activeWorkspace.assignment_id;
      const res = await interventionAPI.getAll(params);
      setInterventions(res.data.interventions || []);
    } catch (err) {
      console.error('Error fetching interventions:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchSuggestions = async () => {
    try {
      const res = await interventionAPI.getSuggestions();
      setSuggestions(res.data.suggestions || []);
    } catch (err) {
      console.error('Error fetching suggestions:', err);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const data = {
        ...formData,
        assignment_id: activeWorkspace?.assignment_id,
      };
      await interventionAPI.create(data);
      setShowCreateModal(false);
      setFormData({
        student_id: '',
        intervention_type: 'remediation',
        concept_name: '',
        description: '',
        priority: 'medium',
      });
      fetchInterventions();
      fetchSuggestions();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create intervention');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateStatus = async (id, status) => {
    try {
      await interventionAPI.update(id, { status });
      fetchInterventions();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this intervention?')) return;
    try {
      await interventionAPI.delete(id);
      fetchInterventions();
    } catch (err) {
      console.error(err);
    }
  };

  const handleQuickCreate = (suggestion) => {
    setFormData({
      student_id: suggestion.student_id,
      intervention_type: suggestion.suggested_type,
      concept_name: suggestion.concept_name,
      description: suggestion.suggested_description,
      priority: suggestion.severity === 'critical' ? 'high' : suggestion.severity === 'high' ? 'medium' : 'low',
    });
    setShowCreateModal(true);
  };

  const filteredInterventions = useMemo(() => {
    let list = [...interventions];
    if (filter !== 'all') {
      list = list.filter(i => i.status === filter);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(i =>
        i.student_name?.toLowerCase().includes(q) ||
        i.concept_name?.toLowerCase().includes(q) ||
        i.description?.toLowerCase().includes(q)
      );
    }
    return list;
  }, [interventions, filter, search]);

  const stats = {
    total: interventions.length,
    planned: interventions.filter(i => i.status === 'planned').length,
    inProgress: interventions.filter(i => i.status === 'in_progress').length,
    completed: interventions.filter(i => i.status === 'completed').length,
  };

  if (loading) return <PageLoader />;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-3">
              <HiOutlineSupport className="text-purple-400" />
              Intervention Tracking
            </h1>
            <p className="text-gray-400 text-sm mt-1">
              Track and manage interventions for at-risk students
            </p>
          </div>
          <motion.button
            onClick={() => setShowCreateModal(true)}
            whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-cyan-600 text-white text-sm font-medium"
          >
            <HiOutlinePlus size={16} /> New Intervention
          </motion.button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          <AnimatedCard>
            <p className="text-gray-400 text-xs mb-1">Total Interventions</p>
            <p className="text-2xl font-bold text-white">{stats.total}</p>
          </AnimatedCard>
          <AnimatedCard glow="yellow">
            <p className="text-gray-400 text-xs mb-1">Planned</p>
            <p className="text-2xl font-bold text-yellow-400">{stats.planned}</p>
          </AnimatedCard>
          <AnimatedCard glow="cyan">
            <p className="text-gray-400 text-xs mb-1">In Progress</p>
            <p className="text-2xl font-bold text-blue-400">{stats.inProgress}</p>
          </AnimatedCard>
          <AnimatedCard glow="green">
            <p className="text-gray-400 text-xs mb-1">Completed</p>
            <p className="text-2xl font-bold text-green-400">{stats.completed}</p>
          </AnimatedCard>
        </div>

        {/* AI Suggestions */}
        {suggestions.length > 0 && (
          <AnimatedCard glow="purple" className="mb-6 border-purple-500/30">
            <div className="flex items-center gap-3 mb-4">
              <HiOutlineSparkles className="text-purple-400" size={24} />
              <div>
                <h2 className="text-white font-semibold">AI-Suggested Interventions</h2>
                <p className="text-xs text-gray-400">{suggestions.length} students need attention</p>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {suggestions.slice(0, 6).map((s, i) => (
                <motion.button
                  key={`${s.student_id}-${s.concept_name}`}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  onClick={() => handleQuickCreate(s)}
                  className="text-left p-3 rounded-xl bg-white/5 border border-purple-500/20 hover:bg-purple-500/10 hover:border-purple-500/40 transition-all"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                      <span className="text-white font-bold text-xs">{s.student_name?.charAt(0)}</span>
                    </div>
                    <span className="text-sm text-white font-medium">{s.student_name}</span>
                    <span className={`ml-auto text-[10px] px-1.5 py-0.5 rounded ${
                      s.severity === 'critical' ? 'bg-red-500/20 text-red-400' :
                      s.severity === 'high' ? 'bg-orange-500/20 text-orange-400' :
                      'bg-yellow-500/20 text-yellow-400'
                    }`}>{s.severity}</span>
                  </div>
                  <p className="text-xs text-gray-400 mb-1">Weak: {s.concept_name}</p>
                  <p className="text-[10px] text-gray-500">Mastery: {s.mastery_pct}% • Click to intervene</p>
                </motion.button>
              ))}
            </div>
          </AnimatedCard>
        )}

        {/* Filters */}
        <div className="flex items-center gap-3 mb-4">
          <div className="flex rounded-xl border border-white/10 p-1">
            {['all', 'planned', 'in_progress', 'completed'].map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 rounded-lg text-xs transition-all ${
                  filter === f ? 'bg-purple-500/20 text-purple-400' : 'text-gray-400 hover:text-white'
                }`}
              >
                {f === 'all' ? 'All' : f === 'in_progress' ? 'In Progress' : f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>
          <div className="relative flex-1 max-w-xs">
            <HiOutlineSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search interventions..."
              className="w-full bg-white/5 border border-white/10 rounded-lg pl-10 pr-4 py-2 text-white text-sm input-glow placeholder-gray-600"
            />
          </div>
        </div>
      </motion.div>

      {/* Interventions List */}
      <div className="space-y-3">
        <AnimatePresence>
          {filteredInterventions.map((intervention, i) => (
            <motion.div
              key={intervention.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ delay: i * 0.03 }}
            >
              <AnimatedCard>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                        <span className="text-white font-bold text-xs">{intervention.student_name?.charAt(0)}</span>
                      </div>
                      <div>
                        <h3 className="text-white font-medium text-sm">{intervention.student_name}</h3>
                        <p className="text-xs text-gray-500">{intervention.concept_name}</p>
                      </div>
                      <span className={`ml-auto px-2 py-0.5 rounded text-[10px] font-medium border ${typeColors[intervention.intervention_type] || 'bg-gray-500/20 text-gray-400'}`}>
                        {intervention.intervention_type}
                      </span>
                    </div>

                    {intervention.description && (
                      <p className="text-sm text-gray-400 mb-3 ml-10">{intervention.description}</p>
                    )}

                    <div className="flex items-center gap-4 ml-10 text-xs">
                      <span className={`px-2 py-0.5 rounded ${statusColors[intervention.status] || ''}`}>
                        {intervention.status}
                      </span>
                      <span className={priorityColors[intervention.priority] || ''}>
                        {intervention.priority} priority
                      </span>
                      {intervention.start_date && (
                        <span className="text-gray-500">
                          {new Date(intervention.start_date).toLocaleDateString()}
                        </span>
                      )}
                      {intervention.outcome_score_before !== null && (
                        <span className="text-gray-400">Before: {intervention.outcome_score_before}%</span>
                      )}
                      {intervention.outcome_score_after !== null && (
                        <span className="text-green-400">After: {intervention.outcome_score_after}%</span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 ml-4">
                    {intervention.status === 'planned' && (
                      <button onClick={() => handleUpdateStatus(intervention.id, 'in_progress')}
                        className="p-2 rounded-lg hover:bg-blue-500/10 text-gray-400 hover:text-blue-400 transition-all" title="Start">
                        <HiOutlineClock size={16} />
                      </button>
                    )}
                    {intervention.status === 'in_progress' && (
                      <button onClick={() => handleUpdateStatus(intervention.id, 'completed')}
                        className="p-2 rounded-lg hover:bg-green-500/10 text-gray-400 hover:text-green-400 transition-all" title="Complete">
                        <HiOutlineCheck size={16} />
                      </button>
                    )}
                    <button onClick={() => handleDelete(intervention.id)}
                      className="p-2 rounded-lg hover:bg-red-500/10 text-gray-400 hover:text-red-400 transition-all" title="Delete">
                      <HiOutlineTrash size={16} />
                    </button>
                  </div>
                </div>
              </AnimatedCard>
            </motion.div>
          ))}
        </AnimatePresence>

        {filteredInterventions.length === 0 && (
          <div className="text-center py-16 text-gray-500">
            <HiOutlineSupport className="mx-auto mb-4" size={48} />
            <p className="mb-2">No interventions yet</p>
            <p className="text-xs text-gray-600">
              {suggestions.length > 0
                ? 'Click on the AI suggestions above to quickly create interventions'
                : 'Create your first intervention to start tracking student support'}
            </p>
          </div>
        )}
      </div>

      {/* Create Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowCreateModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="glass rounded-2xl p-6 w-full max-w-md"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-white">New Intervention</h2>
                <button onClick={() => setShowCreateModal(false)} className="p-2 rounded-lg hover:bg-white/5 text-gray-400">
                  <HiOutlineX size={20} />
                </button>
              </div>

              <form onSubmit={handleCreate} className="space-y-4">
                {error && <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-sm text-red-400">{error}</div>}

                <div>
                  <label className="block text-sm text-gray-300 mb-1.5">Student ID *</label>
                  <input type="number" value={formData.student_id} onChange={(e) => setFormData({ ...formData, student_id: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white text-sm input-glow" required />
                </div>

                <div>
                  <label className="block text-sm text-gray-300 mb-1.5">Type</label>
                  <select value={formData.intervention_type} onChange={(e) => setFormData({ ...formData, intervention_type: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white text-sm input-glow">
                    <option value="remediation" className="bg-gray-900">Remediation</option>
                    <option value="extra_practice" className="bg-gray-900">Extra Practice</option>
                    <option value="tutoring" className="bg-gray-900">Tutoring</option>
                    <option value="counseling" className="bg-gray-900">Counseling</option>
                    <option value="parent_meeting" className="bg-gray-900">Parent Meeting</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm text-gray-300 mb-1.5">Concept Name</label>
                  <input type="text" value={formData.concept_name} onChange={(e) => setFormData({ ...formData, concept_name: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white text-sm input-glow" />
                </div>

                <div>
                  <label className="block text-sm text-gray-300 mb-1.5">Description</label>
                  <textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3} className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white text-sm input-glow" />
                </div>

                <div>
                  <label className="block text-sm text-gray-300 mb-1.5">Priority</label>
                  <select value={formData.priority} onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white text-sm input-glow">
                    <option value="low" className="bg-gray-900">Low</option>
                    <option value="medium" className="bg-gray-900">Medium</option>
                    <option value="high" className="bg-gray-900">High</option>
                    <option value="critical" className="bg-gray-900">Critical</option>
                  </select>
                </div>

                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => setShowCreateModal(false)}
                    className="flex-1 py-2.5 rounded-xl border border-white/10 text-sm text-gray-300 hover:bg-white/5">Cancel</button>
                  <button type="submit" disabled={saving}
                    className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-cyan-600 text-white text-sm font-medium disabled:opacity-50">
                    {saving ? 'Creating...' : 'Create'}
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
