'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { AuthProvider, useAuth } from '@/features/admin/context/AuthContext';

function AdminGuard({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading, admin, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!isLoading && !isAuthenticated && pathname !== '/admin/login') {
      router.replace('/admin/login');
    }
  }, [isAuthenticated, isLoading, pathname, router]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary-600 border-t-transparent" />
          <p className="text-sm text-gray-500">Cargando...</p>
        </div>
      </div>
    );
  }

  // Allow login page to render without the sidebar
  if (!isAuthenticated) {
    return <>{children}</>;
  }

  const navLinks = [
    { href: '/admin/dashboard', label: 'Dashboard', icon: '📊' },
    { href: '/admin/products', label: 'Productos', icon: '🍪' },
    { href: '/admin/categories', label: 'Categorías', icon: '🏷️' },
    { href: '/admin/inventory', label: 'Inventario', icon: '📦' },
    { href: '/admin/orders', label: 'Órdenes', icon: '📋' },
    { href: '/admin/reviews', label: 'Reviews', icon: '⭐' },
    { href: '/admin/audit', label: 'Auditoría', icon: '🔍' },
  ];

  return (
    <div className="flex min-h-screen bg-gray-50">
      <aside className="flex w-64 flex-col bg-gray-900 text-white">
        <div className="border-b border-gray-800 px-6 py-5">
          <Link href="/" className="text-lg font-bold text-primary-400">
            🍪 Crazy Cookies
          </Link>
          <p className="mt-1 text-xs text-gray-500">Panel de Administración</p>
        </div>

        <div className="border-b border-gray-800 px-6 py-4">
          <p className="text-sm font-medium text-gray-200">{admin?.name}</p>
          <p className="text-xs text-gray-500">{admin?.email}</p>
        </div>

        <nav className="flex-1 space-y-0.5 px-3 py-4">
          {navLinks.map(({ href, label, icon }) => {
            const isActive = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors ${
                  isActive
                    ? 'bg-primary-600 font-medium text-white'
                    : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                }`}
              >
                <span>{icon}</span>
                {label}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-gray-800 p-4">
          <button
            onClick={logout}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-gray-400 transition-colors hover:bg-gray-800 hover:text-white"
          >
            <span>🚪</span>
            Cerrar sesión
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-auto">
        <div className="p-8">{children}</div>
      </main>
    </div>
  );
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <AdminGuard>{children}</AdminGuard>
    </AuthProvider>
  );
}
