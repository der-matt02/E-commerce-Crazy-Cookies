'use client';

import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { adminApi } from '@/features/admin/api/admin-api';
import type { AdminUser, AuthContextValue } from '@/types/auth.types';

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [admin, setAdmin] = useState<AdminUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const stored = localStorage.getItem('admin_user');

    if (token && stored) {
      try {
        setAdmin(JSON.parse(stored) as AdminUser);
      } catch {
        localStorage.removeItem('token');
        localStorage.removeItem('admin_user');
      }
    }
    setIsLoading(false);
  }, []);

  const login = useCallback(
    async (email: string, password: string) => {
      const { token, admin: adminData } = await adminApi.login(email, password);
      localStorage.setItem('token', token);
      localStorage.setItem('admin_user', JSON.stringify(adminData));
      setAdmin(adminData);
      router.replace('/admin/dashboard');
    },
    [router]
  );

  const logout = useCallback(() => {
    adminApi.logout();
    setAdmin(null);
    router.replace('/admin/login');
  }, [router]);

  return (
    <AuthContext.Provider
      value={{
        admin,
        isAuthenticated: !!admin,
        isLoading,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth debe usarse dentro de <AuthProvider>');
  }
  return ctx;
}
