import { apiClient, ApiSuccessResponse } from './api';

export type UserRole = 'ADMIN' | 'TRAINER' | 'TRAINEE';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  organizationId: string;
}

export interface RegisterPayload {
  name: string;
  email: string;
  password: string;
  organizationCode: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface AuthData {
  user: User;
  accessToken: string;
}

// In-memory access token storage
let memoryAccessToken: string | null = null;

export function setAccessToken(token: string | null): void {
  memoryAccessToken = token;
}

export function getAccessToken(): string | null {
  return memoryAccessToken;
}

export async function registerApi(payload: RegisterPayload): Promise<AuthData> {
  const res = await apiClient.post<ApiSuccessResponse<AuthData>>('/auth/register', payload);
  setAccessToken(res.data.data.accessToken);
  return res.data.data;
}

export async function loginApi(payload: LoginPayload): Promise<AuthData> {
  const res = await apiClient.post<ApiSuccessResponse<AuthData>>('/auth/login', payload);
  setAccessToken(res.data.data.accessToken);
  return res.data.data;
}

export async function refreshApi(): Promise<AuthData> {
  const res = await apiClient.post<ApiSuccessResponse<AuthData>>('/auth/refresh');
  setAccessToken(res.data.data.accessToken);
  return res.data.data;
}

export async function logoutApi(): Promise<void> {
  try {
    await apiClient.post('/auth/logout');
  } finally {
    setAccessToken(null);
  }
}

export async function getMeApi(): Promise<User> {
  const res = await apiClient.get<ApiSuccessResponse<{ user: User }>>('/auth/me');
  return res.data.data.user;
}

export async function testRbacEndpoint(role: 'admin' | 'trainer' | 'trainee'): Promise<any> {
  const res = await apiClient.get(`/auth/test/${role}`);
  return res.data;
}
