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
      <div className="flex min-h-screen items-center justify-center bg-gray-100">
        <div className="text-gray-500">Cargando...</div>
      </div>
    );
  }

  // Allow login page to render without the sidebar
  if (!isAuthenticated) {
    return <>{children}</>;
  }

  return (
    <div className="flex min-h-screen bg-gray-100">
      <aside className="w-64 bg-gray-900 text-white">
        <div className="border-b border-gray-700 p-6">
          <h2 className="text-xl font-bold">Admin Panel</h2>
          <p className="mt-1 text-sm text-gray-400">{admin?.name}</p>
        </div>
        <nav className="space-y-1 px-3 py-4">
          <Link href="/admin/dashboard" className="block rounded-lg px-4 py-2 hover:bg-gray-800">
            Dashboard
          </Link>
          <Link href="/admin/products" className="block rounded-lg px-4 py-2 hover:bg-gray-800">
            Productos
          </Link>
          <Link href="/admin/categories" className="block rounded-lg px-4 py-2 hover:bg-gray-800">
            Categorías
          </Link>
          <Link href="/admin/inventory" className="block rounded-lg px-4 py-2 hover:bg-gray-800">
            Inventario
          </Link>
          <Link href="/admin/orders" className="block rounded-lg px-4 py-2 hover:bg-gray-800">
            Órdenes
          </Link>
          <Link href="/admin/reviews" className="block rounded-lg px-4 py-2 hover:bg-gray-800">
            Reviews
          </Link>
        </nav>
        <div className="absolute bottom-0 w-64 border-t border-gray-700 p-4">
          <button
            onClick={logout}
            className="w-full rounded-lg px-4 py-2 text-left text-sm text-gray-400 hover:bg-gray-800 hover:text-white"
          >
            Cerrar sesión
          </button>
        </div>
      </aside>
      <main className="flex-1 p-8">{children}</main>
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
