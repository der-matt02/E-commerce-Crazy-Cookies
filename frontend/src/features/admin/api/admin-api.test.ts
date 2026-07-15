import { describe, it, expect, vi, beforeEach } from 'vitest';
import { adminApi } from './admin-api';
import { apiClient } from '@/lib/api-client';

vi.mock('@/lib/api-client', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

const mockedApiClient = vi.mocked(apiClient, true);

describe('adminApi', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    localStorage.clear();
  });

  it('login() posts email/password to /auth/login and returns the response', async () => {
    const response = { token: 'jwt-token', admin: { id: 'admin-1' } } as never;
    mockedApiClient.post.mockResolvedValue({ data: response });

    const result = await adminApi.login('admin@example.com', 'Password123!');

    expect(mockedApiClient.post).toHaveBeenCalledWith('/auth/login', {
      email: 'admin@example.com',
      password: 'Password123!',
    });
    expect(result).toBe(response);
  });

  it('logout() removes the token and admin_user from localStorage', () => {
    localStorage.setItem('token', 'jwt-token');
    localStorage.setItem('admin_user', JSON.stringify({ id: 'admin-1' }));

    adminApi.logout();

    expect(localStorage.getItem('token')).toBeNull();
    expect(localStorage.getItem('admin_user')).toBeNull();
  });

  it('logout() is a no-op (does not throw) when nothing was stored', () => {
    expect(() => adminApi.logout()).not.toThrow();
  });

  it('getStats() fetches /admin/stats and returns the dashboard stats', async () => {
    const stats = { totalOrders: 10, totalRevenue: 50000, totalProducts: 20 } as never;
    mockedApiClient.get.mockResolvedValue({ data: stats });

    const result = await adminApi.getStats();

    expect(mockedApiClient.get).toHaveBeenCalledWith('/admin/stats');
    expect(result).toBe(stats);
  });
});
