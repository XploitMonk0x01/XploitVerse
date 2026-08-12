import api from './api';
import type { User, RegisterData, LoginCredentials, AuthResult, LabSession, FlagSubmitResponse } from '../types';

export const flagService = {
  submit: ({ taskId, flag }: { taskId: string | number; flag: string }) => {
    const normalizedTaskId =
      typeof taskId === 'string' && /^\d+$/.test(taskId.trim())
        ? Number.parseInt(taskId, 10)
        : taskId;

    return api.post<FlagSubmitResponse>('/flags/submit', { taskId: normalizedTaskId, flag });
  },
};

export const authService = {
  register: (userData: RegisterData) => api.post<AuthResult>('/auth/register', userData),
  login: (credentials: LoginCredentials) => api.post<AuthResult>('/auth/login', credentials),
  logout: () => api.post('/auth/logout'),
  getMe: () => api.get<{ user: User }>('/auth/me'),
  updatePassword: (passwords: { currentPassword: string; newPassword: string }) => api.put('/auth/update-password', passwords),
  refreshToken: () => api.post<{ token: string }>('/auth/refresh-token'),
};

export const userService = {
  getAll: (params?: Record<string, unknown>) => api.get('/users', { params }),
  getById: (id: number) => api.get(`/users/${id}`),
  updateProfile: (data: Partial<User>) => api.put('/users/profile', data),
  updateRole: (id: number, role: string) => api.put(`/users/${id}/role`, { role }),
  deactivate: (id: number) => api.put(`/users/${id}/deactivate`),
  reactivate: (id: number) => api.put(`/users/${id}/reactivate`),
  getStats: () => api.get('/users/stats'),
  getMyProgress: () => api.get('/users/me/progress'),
};

export const labSessionService = {
  create: (data: Partial<LabSession>) => api.post('/lab-sessions', data),
  getAll: (params?: Record<string, unknown>) => api.get('/lab-sessions', { params }),
  getById: (id: number) => api.get(`/lab-sessions/${id}`),
  getActive: () => api.get('/lab-sessions/active'),
  updateStatus: (id: number, data: Record<string, unknown>) => api.patch(`/lab-sessions/${id}/status`, data),
  terminate: (id: number) => api.post(`/lab-sessions/${id}/terminate`),
  updateNotes: (id: number, notes: string) => api.patch(`/lab-sessions/${id}/notes`, { notes }),
  getStats: () => api.get('/lab-sessions/stats'),
};

export const courseService = {
  getAll: (params?: Record<string, unknown>) => api.get('/courses', { params }),
  getBySlug: (slug: string) => api.get(`/courses/${slug}`),
};

export const moduleService = {
  getById: (id: number) => api.get(`/modules/${id}`),
};

export const taskService = {
  getById: (id: number) => api.get(`/tasks/${id}`),
};

export const labService = {
  getAll: () => api.get('/labs'),
  startLab: (labId: number) => api.post('/labs/start', { labId }),
  stopLab: (sessionId: number) => api.post('/labs/stop', { sessionId }),
  getActiveSession: () => api.get('/labs/active-session'),
  completeProvisioning: (sessionId: number) => api.post(`/labs/session/${sessionId}/provision`),
};

export const leaderboardService = {
  getTop: () => api.get('/leaderboard'),
  getMyRank: () => api.get('/leaderboard/me'),
};

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
};