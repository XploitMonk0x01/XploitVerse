import api from './api'

export const flagService = {
  submit: ({ taskId, flag }) => api.post('/flags/submit', { taskId, flag }),
}

export const authService = {
  register: (userData) => api.post('/auth/register', userData),
  login: (credentials) => api.post('/auth/login', credentials),
  logout: () => api.post('/auth/logout'),
  getMe: () => api.get('/auth/me'),
  updatePassword: (passwords) => api.put('/auth/update-password', passwords),
  refreshToken: () => api.post('/auth/refresh-token'),
}

export const userService = {
  getAll: (params) => api.get('/users', { params }),
  getById: (id) => api.get(`/users/${id}`),
  updateProfile: (data) => api.put('/users/profile', data),
  updateRole: (id, role) => api.put(`/users/${id}/role`, { role }),
  deactivate: (id) => api.put(`/users/${id}/deactivate`),
  reactivate: (id) => api.put(`/users/${id}/reactivate`),
  getStats: () => api.get('/users/stats'),
  getMyProgress: () => api.get('/users/me/progress'),
}

export const labSessionService = {
  create: (data) => api.post('/lab-sessions', data),
  getAll: (params) => api.get('/lab-sessions', { params }),
  getById: (id) => api.get(`/lab-sessions/${id}`),
  getActive: () => api.get('/lab-sessions/active'),
  updateStatus: (id, data) => api.patch(`/lab-sessions/${id}/status`, data),
  terminate: (id) => api.post(`/lab-sessions/${id}/terminate`),
  extend: (id) => api.post(`/lab-sessions/${id}/extend`),
  updateNotes: (id, notes) => api.patch(`/lab-sessions/${id}/notes`, { notes }),
  getStats: () => api.get('/lab-sessions/stats'),
}

// Course Content Services - Phase 1
export const courseService = {
  getAll: (params) => api.get('/courses', { params }),
  getBySlug: (slug) => api.get(`/courses/${slug}`),
}

export const moduleService = {
  getById: (id) => api.get(`/modules/${id}`),
}

export const taskService = {
  getById: (id) => api.get(`/tasks/${id}`),
}

// Lab Management Service - Week 2
export const labService = {
  getAll: () => api.get('/labs'),
  startLab: (labId) => api.post('/labs/start', { labId }),
  stopLab: (sessionId) => api.post('/labs/stop', { sessionId }),
  getActiveSession: () => api.get('/labs/active-session'),
  getSessionStatus: (sessionId) => api.get(`/labs/session/${sessionId}/status`),
  completeProvisioning: (sessionId) =>
    api.post(`/labs/session/${sessionId}/provision`),
}

export const leaderboardService = {
  getTop: () => api.get('/leaderboard'),
  getMyRank: () => api.get('/leaderboard/me'),
}

export default {
  auth: authService,
  users: userService,
  labSessions: labSessionService,
  labs: labService,
  courses: courseService,
  modules: moduleService,
  tasks: taskService,
  flags: flagService,
  leaderboard: leaderboardService,
}
