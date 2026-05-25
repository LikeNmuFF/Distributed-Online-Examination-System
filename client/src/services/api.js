import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost';

const api = axios.create({
  baseURL: `${API_URL}/api`,
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

export const examsAPI = {
  getList: () => api.get('/exams'),
  get: (examId) => api.get(`/exams/${examId}`),
  start: (examId) => api.post(`/exams/${examId}/start`),
  create: (data) => api.post('/exams/create', data),
};

export const submissionsAPI = {
  submit: (examId, answers, sessionId) =>
    api.post(`/submissions/exams/${examId}/submit`, { answers, sessionId }),
  getJobStatus: (jobId) => api.get(`/submissions/${jobId}/status`),
  getMySubmissions: () => api.get('/submissions/my'),
};

export default api;
