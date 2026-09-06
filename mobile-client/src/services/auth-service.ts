import { api } from '@/services/api';
import type { AuthResponse, LoginInput, RegisterInput } from '@/types/auth';

export const authService = {
  async login(input: LoginInput) {
    const { data } = await api.post<AuthResponse>('/api/auth/login-custom', input);
    return data;
  },

  async register(input: RegisterInput) {
    const { data } = await api.post<{ message: string }>('/api/auth/register-custom', input);
    return data;
  },

  async forgotPassword(email: string) {
    const { data } = await api.post<{ message: string }>('/api/auth/forgot-password', { email });
    return data;
  },
};

