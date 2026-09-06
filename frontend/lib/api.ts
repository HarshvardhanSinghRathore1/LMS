import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { getAccessToken, setAccessToken } from './auth';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
  timeout: 10000,
});

// Attach JWT access token to outbound requests if present
apiClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = getAccessToken();
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Automatic 401 token refresh queue handling
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value?: unknown) => void;
  reject: (reason?: any) => void;
}> = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    if (
      error.response?.status === 401 &&
      originalRequest &&
      !originalRequest._retry &&
      !originalRequest.url?.includes('/auth/login') &&
      !originalRequest.url?.includes('/auth/refresh') &&
      !originalRequest.url?.includes('/auth/register')
    ) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            if (originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${token}`;
            }
            return apiClient(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const response = await axios.post(
          `${API_BASE_URL}/auth/refresh`,
          {},
          { withCredentials: true }
        );
        const newAccessToken = response.data?.data?.accessToken;
        setAccessToken(newAccessToken);
        processQueue(null, newAccessToken);

        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        }
        return apiClient(originalRequest);
      } catch (refreshErr) {
        processQueue(refreshErr, null);
        setAccessToken(null);
        return Promise.reject(refreshErr);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export interface ApiSuccessResponse<T = any> {
  success: true;
  data: T;
  message?: string;
}

export interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: any;
    requestId?: string;
  };
}

export interface HealthData {
  status: 'healthy' | 'degraded';
  service: string;
  database: 'connected' | 'disconnected';
  latencyMs?: number;
  requestId?: string;
}

export async function fetchApiHealth(): Promise<{
  isHealthy: boolean;
  data?: HealthData;
  error?: string;
  latencyMs: number;
  requestId?: string;
}> {
  const startTime = Date.now();
  try {
    const response = await apiClient.get<ApiSuccessResponse<HealthData>>('/health');
    const latencyMs = Date.now() - startTime;
    const requestId = response.headers['x-request-id'] || response.data.data?.requestId;

    return {
      isHealthy: response.data.success && response.data.data.database === 'connected',
      data: {
        ...response.data.data,
        latencyMs,
        requestId,
      },
      latencyMs,
      requestId,
    };
  } catch (error: any) {
    const latencyMs = Date.now() - startTime;
    const axiosError = error as AxiosError<ApiErrorResponse>;

    if (axiosError.response) {
      const errBody = axiosError.response.data;
      const requestId = axiosError.response.headers['x-request-id'] || errBody?.error?.requestId;
      return {
        isHealthy: false,
        error: errBody?.error?.message || 'API returned degraded status',
        data: {
          status: 'degraded',
          service: 'capacity-connect-api',
          database: 'disconnected',
          latencyMs,
          requestId,
        },
        latencyMs,
        requestId,
      };
    }

    return {
      isHealthy: false,
      error: 'Backend API server unavailable (Network Error)',
      data: {
        status: 'degraded',
        service: 'capacity-connect-api',
        database: 'disconnected',
        latencyMs,
      },
      latencyMs,
    };
  }
}
