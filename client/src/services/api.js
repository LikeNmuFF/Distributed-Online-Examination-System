import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || '';

const api = axios.create({
  baseURL: API_URL ? `${API_URL}/api` : '/api',
  timeout: 10000,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/';
    }
    return Promise.reject(error);
  }
);

export const authAPI = {
  login: (username, password) =>
    api.post('/auth/login', { username, password }),
  register: (username, password) =>
    api.post('/auth/register', { username, password }),
  getMe: () => api.get('/auth/me'),
};

export const teachersAPI = {
  login: (username, password) =>
    api.post('/teachers/login', { username, password }),
  register: (username, password, email) =>
    api.post('/teachers/register', { username, password, email }),
  getMe: () => api.get('/teachers/me'),
  getClassrooms: () => api.get('/teachers/classrooms'),
  getClassroomDetails: (classroomId) =>
    api.get(`/teachers/classrooms/${classroomId}`),
};

export const studentsAPI = {
  login: (username, password) =>
    api.post('/auth/login', { username, password }),
  register: (username, password) =>
    api.post('/auth/register', { username, password }),
  getMe: () => api.get('/auth/me'),
};

export const classroomsAPI = {
  create: (data) => api.post('/classrooms/create', data),
  update: (classroomId, data) =>
    api.put(`/classrooms/${classroomId}`, data),
  delete: (classroomId) =>
    api.delete(`/classrooms/${classroomId}`),
  getMembers: (classroomId) =>
    api.get(`/classrooms/${classroomId}/members`),
  approveMember: (classroomId, studentId) =>
    api.post(`/classrooms/${classroomId}/members/${studentId}/approve`),
  rejectMember: (classroomId, studentId) =>
    api.post(`/classrooms/${classroomId}/members/${studentId}/reject`),
  removeMember: (classroomId, studentId) =>
    api.delete(`/classrooms/${classroomId}/members/${studentId}`),
  getExams: (classroomId) =>
    api.get(`/classrooms/${classroomId}/exams`),
};

export const classroomJoinAPI = {
  requestToJoin: (joinCode) =>
    api.post('/classroom-join/request', { joinCode }),
  getMyRequests: () => api.get('/classroom-join/my-requests'),
  getMyClassrooms: () => api.get('/classroom-join/my-classrooms'),
  leaveClassroom: (classroomId) =>
    api.delete(`/classroom-join/${classroomId}`),
};

export const examsAPI = {
  getList: () => api.get('/exams'),
  get: (examId) => api.get(`/exams/${examId}`),
  start: (examId) => api.post(`/exams/${examId}/start`),
  create: (data) => api.post('/exams/create', data),
};

export const examManagementAPI = {
  create: (data) => api.post('/exam-management/teacher/create', data),
  update: (examId, data) =>
    api.put(`/exam-management/${examId}`, data),
  delete: (examId) =>
    api.delete(`/exam-management/${examId}`),
  addToClassroom: (examId, classroomId) =>
    api.post(`/exam-management/${examId}/add-to-classroom/${classroomId}`),
  removeFromClassroom: (examId, classroomId) =>
    api.delete(`/exam-management/${examId}/remove-from-classroom/${classroomId}`),
  getTeacherExams: () =>
    api.get('/exam-management/teacher/list'),
};

export const submissionsAPI = {
  submit: (examId, answers, sessionId) =>
    api.post(`/submissions/exams/${examId}/submit`, { answers, sessionId }),
  getJobStatus: (jobId) => api.get(`/submissions/${jobId}/status`),
  getMySubmissions: () => api.get('/submissions/my'),
};

export const analyticsAPI = {
  getClassroomPerformance: (classroomId) =>
    api.get(`/analytics/classrooms/${classroomId}/performance`),
  getExamResults: (classroomId, examId) =>
    api.get(`/analytics/classrooms/${classroomId}/exam/${examId}/results`),
  getStudentPerformance: () =>
    api.get('/analytics/student/performance'),
  getExamDetails: (examId) =>
    api.get(`/analytics/student/exams/${examId}`),
};

export const scoreboardAPI = {
  getAll: (classroom, exam) => {
    const params = new URLSearchParams();
    if (classroom) params.append('classroom', classroom);
    if (exam) params.append('exam', exam);
    return api.get(`/scoreboard?${params.toString()}`);
  },
  getClassrooms: () => api.get('/scoreboard/classrooms'),
  getExams: () => api.get('/scoreboard/exams'),
};

export default api;
