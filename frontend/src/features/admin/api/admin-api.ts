import { apiClient } from '@/lib/api-client';
import type { DashboardStats } from '@/types/admin.types';
import type { LoginResponse } from '@/types/auth.types';

export const adminApi = {
  async login(email: string, password: string): Promise<LoginResponse> {
    const { data } = await apiClient.post<LoginResponse>('/auth/login', { email, password });
    return data;
  },

  logout(): void {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('token');
      localStorage.removeItem('admin_user');
    }
  },

  async getStats(): Promise<DashboardStats> {
    const { data } = await apiClient.get<DashboardStats>('/admin/stats');
    return data;
  },
};
