import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import AnimatedCard from '../components/AnimatedCard';
import { PageLoader } from '../components/LoadingScreen';
import { notificationAPI, studentAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  HiOutlineMail,
  HiOutlineChat,
  HiOutlinePhone,
  HiOutlineBell,
  HiOutlinePaperAirplane,
  HiOutlineCog,
  HiOutlineUserGroup,
  HiOutlineCheckCircle,
  HiOutlineX,
  HiOutlineSearch,
} from 'react-icons/hi';

export default function Notifications() {
  const { user, activeWorkspace } = useAuth();
  const [view, setView] = useState('students');
  const [students, setStudents] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [settings, setSettings] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sendTitle, setSendTitle] = useState('');
  const [sendMessage, setSendMessage] = useState('');
  const [sendChannel, setSendChannel] = useState('email');
  const [sendType, setSendType] = useState('report');
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState(null);
  const [search, setSearch] = useState('');
  const [stats, setStats] = useState({ total: 0, email: 0, sms: 0, whatsapp: 0 });

  useEffect(() => {
    fetchStudents();
    fetchHistory();
  }, [activeWorkspace]);

  const fetchStudents = async () => {
    try {
      const params = {};
      if (activeWorkspace) params.assignment_id = activeWorkspace.assignment_id;
      const res = await notificationAPI.getStudentsWithParents(params);
      setStudents(res.data.students || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchHistory = async () => {
    try {
      const res = await notificationAPI.getHistory();
      setHistory(res.data.notifications || []);
      setStats(res.data.stats || {});
    } catch (err) {
      console.error(err);
    }
  };

  const fetchSettings = async (studentId) => {
    try {
      const res = await notificationAPI.getSettings(studentId);
      setSettings(res.data.settings);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSelectStudent = (student) => {
    setSelectedStudent(student);
    setView('settings');
    fetchSettings(student.id);
    setSendTitle('');
    setSendMessage('');
    setSendResult(null);
  };

  const handleSaveSettings = async () => {
    setSaving(true);
    try {
      await notificationAPI.updateSettings(selectedStudent.id, settings);
      alert('Settings saved!');
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleSend = async (e) => {
    e.preventDefault();
    setSending(true);
    setSendResult(null);
    try {
      const res = await notificationAPI.send({
        student_id: selectedStudent.id,
        notification_type: sendType,
        channel: sendChannel,
        title: sendTitle,
        message: sendMessage,
      });
      setSendResult(res.data);
      fetchHistory();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to send');
    } finally {
      setSending(false);
    }
  };

  const filteredStudents = students.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.class_name.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <PageLoader />;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <h1 className="text-2xl font-bold text-white flex items-center gap-3 mb-2">
          <HiOutlineBell className="text-purple-400" />
          Parent Notifications
        </h1>
        <p className="text-gray-400 text-sm">
          Send reports and alerts to parents via email, SMS, or WhatsApp
        </p>
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        <AnimatedCard><p className="text-gray-400 text-xs mb-1">Total Sent</p><p className="text-2xl font-bold text-white">{stats.total}</p></AnimatedCard>
        <AnimatedCard glow="cyan"><p className="text-gray-400 text-xs mb-1">Email</p><p className="text-2xl font-bold text-cyan-400">{stats.email}</p></AnimatedCard>
        <AnimatedCard glow="green"><p className="text-gray-400 text-xs mb-1">SMS</p><p className="text-2xl font-bold text-green-400">{stats.sms}</p></AnimatedCard>
        <AnimatedCard glow="purple"><p className="text-gray-400 text-xs mb-1">WhatsApp</p><p className="text-2xl font-bold text-purple-400">{stats.whatsapp}</p></AnimatedCard>
      </div>

      {/* View: Students List */}
      {view === 'students' && (
        <>
          <div className="glass rounded-xl p-4 mb-6">
            <div className="relative">
              <HiOutlineSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
              <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
                placeholder="Search students..." className="w-full bg-white/5 border border-white/10 rounded-lg py-2.5 pl-10 pr-4 text-white input-glow text-sm placeholder-gray-600" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredStudents.map((s, i) => (
              <motion.button
                key={s.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                onClick={() => handleSelectStudent(s)}
                className="glass rounded-xl p-4 text-left border border-white/10 hover:border-purple-500/30 transition-all group"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                    <span className="text-white font-bold text-sm">{s.name.charAt(0)}</span>
                  </div>
                  <div>
                    <p className="text-white font-medium text-sm">{s.name}</p>
                    <p className="text-xs text-gray-500">{s.class_name} • Roll: {s.roll_number}</p>
                  </div>
                </div>
                <div className="space-y-1 text-xs text-gray-400">
                  <p>Parent: {s.parent_name}</p>
                  {s.has_email && <p className="text-cyan-400"><HiOutlineMail className="inline mr-1" size={12} />{s.parent_email}</p>}
                  {s.has_phone && <p className="text-green-400"><HiOutlinePhone className="inline mr-1" size={12} />{s.parent_phone}</p>}
                </div>
                {!s.has_email && !s.has_phone && (
                  <p className="text-xs text-gray-600 mt-2">No parent contact info</p>
                )}
              </motion.button>
            ))}
          </div>

          {filteredStudents.length === 0 && (
            <div className="text-center py-16 text-gray-500">
              <HiOutlineUserGroup className="mx-auto mb-4" size={48} />
              <p>No students with parent contact info found</p>
            </div>
          )}
        </>
      )}

      {/* View: Settings & Send */}
      {view === 'settings' && selectedStudent && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Notification Settings */}
          <AnimatedCard glow="purple">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                  <span className="text-white font-bold">{selectedStudent.name.charAt(0)}</span>
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-white">{selectedStudent.name}</h2>
                  <p className="text-xs text-gray-400">{selectedStudent.class_name}</p>
                </div>
              </div>
              <button onClick={() => setView('students')} className="text-sm text-purple-400 hover:text-purple-300">&larr; Back</button>
            </div>

            <h3 className="text-sm font-medium text-white mb-4 flex items-center gap-2">
              <HiOutlineCog className="text-cyan-400" />
              Notification Preferences
            </h3>

            <div className="space-y-4">
              {[
                { key: 'send_email', label: 'Send Email Reports', icon: HiOutlineMail },
                { key: 'send_sms', label: 'Send SMS Alerts', icon: HiOutlinePhone },
                { key: 'send_whatsapp', label: 'Send WhatsApp Messages', icon: HiOutlineChat },
                { key: 'weekly_summary', label: 'Weekly Summary Reports', icon: HiOutlineBell },
                { key: 'alert_on_low_score', label: 'Alert on Low Scores', icon: HiOutlineCheckCircle },
                { key: 'report_on_new_quiz', label: 'Report on New Quizzes', icon: HiOutlinePaperAirplane },
              ].map(({ key, label, icon: Icon }) => (
                <div key={key} className="flex items-center justify-between p-3 rounded-xl bg-white/5">
                  <span className="flex items-center gap-2 text-sm text-gray-300">
                    <Icon size={16} className="text-gray-500" />
                    {label}
                  </span>
                  <button
                    onClick={() => setSettings({ ...settings, [key]: !settings[key] })}
                    className={`w-10 h-6 rounded-full transition-colors ${
                      settings?.[key] ? 'bg-purple-500' : 'bg-gray-600'
                    }`}
                  >
                    <motion.div
                      className="w-4 h-4 rounded-full bg-white shadow"
                      animate={{ x: settings?.[key] ? 20 : 4 }}
                      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                    />
                  </button>
                </div>
              ))}

              <div className="p-3 rounded-xl bg-white/5">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-300">Alert Threshold</span>
                  <span className="text-sm text-white font-medium">{settings?.alert_threshold || 40}%</span>
                </div>
                <input
                  type="range"
                  min={20}
                  max={80}
                  value={settings?.alert_threshold || 40}
                  onChange={(e) => setSettings({ ...settings, alert_threshold: parseInt(e.target.value) })}
                  className="w-full"
                />
              </div>

              <button
                onClick={handleSaveSettings}
                disabled={saving}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-cyan-600 text-white text-sm font-medium disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save Settings'}
              </button>
            </div>
          </AnimatedCard>

          {/* Send Notification */}
          <AnimatedCard glow="cyan">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <HiOutlinePaperAirplane className="text-cyan-400" />
              Send Notification
            </h2>

            <form onSubmit={handleSend} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-400 mb-1.5">Channel</label>
                  <select value={sendChannel} onChange={(e) => setSendChannel(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm input-glow">
                    <option value="email" className="bg-gray-900">📧 Email</option>
                    <option value="sms" className="bg-gray-900">📱 SMS</option>
                    <option value="whatsapp" className="bg-gray-900">💬 WhatsApp</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1.5">Type</label>
                  <select value={sendType} onChange={(e) => setSendType(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm input-glow">
                    <option value="report" className="bg-gray-900">Report</option>
                    <option value="alert" className="bg-gray-900">Alert</option>
                    <option value="intervention_update" className="bg-gray-900">Intervention</option>
                    <option value="weekly_summary" className="bg-gray-900">Weekly Summary</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs text-gray-400 mb-1.5">Title</label>
                <input type="text" value={sendTitle} onChange={(e) => setSendTitle(e.target.value)}
                  placeholder="e.g., Quiz Performance Update"
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white text-sm input-glow" />
              </div>

              <div>
                <label className="block text-xs text-gray-400 mb-1.5">Message</label>
                <textarea value={sendMessage} onChange={(e) => setSendMessage(e.target.value)}
                  rows={4} placeholder="Type your message to the parent..."
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white text-sm input-glow" required />
              </div>

              <div className="text-xs text-gray-500 mb-2">
                Parent contact: {selectedStudent.parent_email || selectedStudent.parent_phone || 'No contact'}
              </div>

              <button type="submit" disabled={sending || !sendMessage}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-cyan-600 text-white text-sm font-medium disabled:opacity-50">
                {sending ? 'Sending...' : (
                  <span className="flex items-center justify-center gap-2">
                    <HiOutlinePaperAirplane size={16} />
                    Send via {sendChannel === 'email' ? 'Email' : sendChannel === 'sms' ? 'SMS' : 'WhatsApp'}
                  </span>
                )}
              </button>

              {sendResult && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                  className="p-3 rounded-xl bg-green-500/10 border border-green-500/20">
                  <p className="text-sm text-green-400 mb-1">✓ Notification sent!</p>
                  {Object.entries(sendResult.delivery || {}).map(([k, v]) => (
                    <p key={k} className="text-xs text-gray-400">{v}</p>
                  ))}
                </motion.div>
              )}
            </form>
          </AnimatedCard>

          {/* History */}
          <AnimatedCard glow="purple" className="lg:col-span-2">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <HiOutlineBell className="text-purple-400" />
              Recent Notification History
            </h2>
            <div className="space-y-3 max-h-80 overflow-y-auto">
              {history.slice(0, 10).map((n, i) => (
                <div key={n.id} className="flex items-start gap-3 p-3 rounded-xl bg-white/5">
                  <div className={`p-2 rounded-lg ${
                    n.channel === 'email' ? 'bg-cyan-500/20' :
                    n.channel === 'sms' ? 'bg-green-500/20' :
                    n.channel === 'whatsapp' ? 'bg-purple-500/20' : 'bg-gray-500/20'
                  }`}>
                    {n.channel === 'email' ? <HiOutlineMail size={16} className="text-cyan-400" /> :
                     n.channel === 'sms' ? <HiOutlinePhone size={16} className="text-green-400" /> :
                     <HiOutlineChat size={16} className="text-purple-400" />}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm text-white font-medium">{n.title || n.student_name}</p>
                      <span className={`px-1.5 py-0.5 rounded text-[10px] ${
                        n.status === 'sent' ? 'bg-green-500/20 text-green-400' :
                        n.status === 'delivered' ? 'bg-blue-500/20 text-blue-400' :
                        n.status === 'failed' ? 'bg-red-500/20 text-red-400' :
                        'bg-gray-500/20 text-gray-400'
                      }`}>{n.status}</span>
                    </div>
                    {n.message && <p className="text-xs text-gray-400 mt-1 line-clamp-2">{n.message}</p>}
                    <p className="text-[10px] text-gray-500 mt-1">{new Date(n.sent_at).toLocaleString()}</p>
                  </div>
                </div>
              ))}
              {history.length === 0 && (
                <p className="text-center py-8 text-gray-500 text-sm">No notifications sent yet.</p>
              )}
            </div>
          </AnimatedCard>
        </div>
      )}
    </div>
  );
}
