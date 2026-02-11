import { apiClient } from '@/lib/api-client';
import type { DashboardStats } from '@/types/admin.types';

export const adminApi = {
  async getStats(): Promise<DashboardStats> {
    const { data } = await apiClient.get<DashboardStats>('/admin/stats');
    return data;
  },
};
