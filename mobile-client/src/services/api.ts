import { create, isAxiosError } from 'axios';

import { API_URL } from '@/config/env';
import { getSessionToken } from '@/storage/session-storage';

export const api = create({
  baseURL: API_URL,
  // Render free instances can need close to a minute for the first cold start.
  timeout: 65000,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use(async (config) => {
  const token = await getSessionToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export function getApiErrorMessage(error: unknown, fallback = 'Không thể kết nối máy chủ.') {
  if (isAxiosError(error)) {
    return error.response?.data?.message || error.response?.data?.error || error.message || fallback;
  }
  return error instanceof Error ? error.message : fallback;
}
