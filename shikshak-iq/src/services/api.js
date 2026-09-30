import axios from 'axios';

const API_BASE = '/api';

const api = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add JWT token (supports both teacher & student tokens)
api.interceptors.request.use(
  (config) => {
    // Check for teacher token first, then student token
    const token = localStorage.getItem('shikshak_iq_token') || localStorage.getItem('shikshak_iq_student_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const isStudent = localStorage.getItem('shikshak_iq_student_token');
      if (isStudent) {
        localStorage.removeItem('shikshak_iq_student_token');
        window.location.href = '/student-portal';
      } else {
        localStorage.removeItem('shikshak_iq_token');
        localStorage.removeItem('shikshak_iq_user');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// Auth APIs
export const authAPI = {
  login: (email, password) => api.post('/auth/login', { email, password }),
  getMe: () => api.get('/auth/me'),
  changePassword: (currentPassword, newPassword) =>
    api.put('/auth/change-password', { current_password: currentPassword, new_password: newPassword }),
  getWorkspace: (assignmentId) => api.get(`/auth/teacher-workspace/${assignmentId}`),
};

// ========================
// ADMIN APIs (Principal)
// ========================
export const adminAPI = {
  getSchool: () => api.get('/admin/school'),
  updateSchool: (data) => api.put('/admin/school', data),
  getDashboard: () => api.get('/admin/dashboard'),
  getStructure: () => api.get('/admin/structure'),

  // Academic Years
  getAcademicYears: () => api.get('/admin/academic-years'),
  createAcademicYear: (data) => api.post('/admin/academic-years', data),
  updateAcademicYear: (id, data) => api.put(`/admin/academic-years/${id}`, data),
  activateAcademicYear: (id) => api.post(`/admin/academic-years/${id}/activate`),

  // Classes
  getClasses: () => api.get('/admin/classes'),
  createClass: (data) => api.post('/admin/classes', data),
  updateClass: (id, data) => api.put(`/admin/classes/${id}`, data),
  deleteClass: (id) => api.delete(`/admin/classes/${id}`),

  // Subjects
  getSubjects: () => api.get('/admin/subjects'),
  createSubject: (data) => api.post('/admin/subjects', data),
  updateSubject: (id, data) => api.put(`/admin/subjects/${id}`, data),
  deleteSubject: (id) => api.delete(`/admin/subjects/${id}`),

  // Teachers
  getTeachers: () => api.get('/admin/teachers'),
  createTeacher: (data) => api.post('/admin/teachers', data),
  updateTeacher: (id, data) => api.put(`/admin/teachers/${id}`, data),
  deleteTeacher: (id) => api.delete(`/admin/teachers/${id}`),

  // Assignments
  getAssignments: () => api.get('/admin/assignments'),
  createAssignment: (data) => api.post('/admin/assignments', data),
  deleteAssignment: (id) => api.delete(`/admin/assignments/${id}`),
};

// Student APIs
export const studentAPI = {
  getAll: (params) => api.get('/students', { params }),
  getByClass: (classId) => api.get(`/students/by-class/${classId}`),
  getById: (id) => api.get(`/students/${id}`),
  create: (data) => api.post('/students', data),
  update: (id, data) => api.put(`/students/${id}`, data),
  delete: (id) => api.delete(`/students/${id}`),
  importCSV: (formData) =>
    api.post('/students/import-csv', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
};

// Quiz APIs
export const quizAPI = {
  getAll: (params) => api.get('/quizzes', { params }),
  getById: (id) => api.get(`/quizzes/${id}`),
  create: (data) => api.post('/quizzes', data),
  update: (id, data) => api.put(`/quizzes/${id}`, data),
  delete: (id) => api.delete(`/quizzes/${id}`),
  generateAI: (data) => api.post('/quizzes/generate-ai', data),
  submitQuiz: (quizId, data) => api.post(`/quizzes/${quizId}/submit`, data),
  getResults: (quizId) => api.get(`/quizzes/${quizId}/results`),
  getPrintData: (quizId) => api.get(`/quizzes/${quizId}/print`),
};

// Analytics APIs
export const analyticsAPI = {
  getDashboard: (params) => api.get('/dashboard', { params }),
  getStudentAnalytics: (id) => api.get(`/analytics/student/${id}`),
  getClassAnalytics: (params) => api.get('/analytics/class', { params }),
  generateReport: (data) => api.post('/reports/generate', data),
  getPeerComparison: (studentId) => api.get(`/analytics/peer-comparison/${studentId}`),
  getEarlyWarnings: (params) => api.get('/analytics/early-warnings', { params }),
};

// Paper Analysis APIs
export const paperAPI = {
  analyzePaper: (formData) =>
    api.post('/paper/analyze', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  batchAnalyze: (formData) =>
    api.post('/paper/batch-analyze', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  confirmMatch: (data) => api.post('/paper/confirm-match', data),
  getScannedResults: () => api.get('/paper/scanned-results'),
};

// BKT APIs
export const bktAPI = {
  getMasteryMap: (params) => api.get('/analytics/mastery-map', { params }),
  getGrowthTimeline: (studentId) => api.get(`/analytics/growth/${studentId}`),
  getRiskPrediction: () => api.get('/analytics/risk-prediction'),
  getPeerComparison: (studentId) => api.get(`/analytics/peer-comparison/${studentId}`),
  getEarlyWarnings: (params) => api.get('/analytics/early-warnings', { params }),
};

// IRT APIs
export const irtAPI = {
  getQuestionQuality: () => api.get('/analytics/question-quality'),
  getStudentAbility: (studentId) => api.get(`/analytics/ability/${studentId}`),
};

// Student Portal APIs
export const studentPortalAPI = {
  login: (username, password) => api.post('/student/login', { username, password }),
  getProfile: () => api.get('/student/me'),
  getProgress: () => api.get('/student/progress'),
  getRemediationQuizzes: () => api.get('/student/remediation-quizzes'),
  submitQuiz: (quizId, data) => api.post(`/student/quizzes/${quizId}/submit`, data),
  generateRemediation: () => api.post('/student/remediation/generate'),
};

// Remediation APIs
export const remediationAPI = {
  generateForStudent: (studentId) => api.post(`/remediation/generate/${studentId}`),
  generateForClass: (assignmentId) => api.post(`/remediation/generate-class/${assignmentId}`),
};

// Intervention APIs
export const interventionAPI = {
  getAll: (params) => api.get('/interventions', { params }),
  getSuggestions: () => api.get('/interventions/suggestions'),
  create: (data) => api.post('/interventions', data),
  update: (id, data) => api.put(`/interventions/${id}`, data),
  delete: (id) => api.delete(`/interventions/${id}`),
};

// Notification APIs
export const notificationAPI = {
  getSettings: (studentId) => api.get(`/notifications/settings/${studentId}`),
  updateSettings: (studentId, data) => api.put(`/notifications/settings/${studentId}`, data),
  send: (data) => api.post('/notifications/send', data),
  getHistory: () => api.get('/notifications/history'),
  getStudentsWithParents: (params) => api.get('/notifications/students-with-parents', { params }),
};

export default api;
