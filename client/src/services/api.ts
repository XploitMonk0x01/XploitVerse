import type { InternalAxiosRequestConfig, AxiosError, AxiosResponse } from 'axios';
import axios from 'axios';

export interface ApiEnvelope<T> {
  success: boolean;
  message: string;
  data?: T;
}

export interface PaginatedEnvelope<T> {
  success: boolean;
  message: string;
  data: {
    items: T[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  };
}

function unwrap<T>(response: AxiosResponse<ApiEnvelope<T>>): T {
  if (!response.data.success) {
    throw new ApiError(response.data.message, response.status);
  }
  return response.data.data as T;
}

function unwrapPaginated<T>(response: AxiosResponse<PaginatedEnvelope<T>>): { items: T[]; pagination: PaginatedEnvelope<T>['data']['pagination'] } {
  if (!response.data.success) {
    throw new ApiError(response.data.message, response.status);
  }
  return {
    items: response.data.data.items,
    pagination: response.data.data.pagination,
  };
}

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly response?: AxiosResponse,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE || '/api',
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error: AxiosError) => Promise.reject(error),
);

api.interceptors.response.use(
  (response: AxiosResponse) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  },
);

export const apiClient = {
  get: <T>(url: string, params?: Record<string, unknown>) =>
    api.get<ApiEnvelope<T>>(url, { params }).then(unwrap),

  post: <T>(url: string, data?: unknown) =>
    api.post<ApiEnvelope<T>>(url, data).then(unwrap),

  put: <T>(url: string, data?: unknown) =>
    api.put<ApiEnvelope<T>>(url, data).then(unwrap),

  patch: <T>(url: string, data?: unknown) =>
    api.patch<ApiEnvelope<T>>(url, data).then(unwrap),

  delete: <T>(url: string) =>
    api.delete<ApiEnvelope<T>>(url).then(unwrap),

  getPaginated: <T>(url: string, params?: Record<string, unknown>) =>
    api.get<PaginatedEnvelope<T>>(url, { params }).then(unwrapPaginated),
};

export default api;