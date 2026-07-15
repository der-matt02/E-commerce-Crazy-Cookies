'use client';

import { useEffect, useState } from 'react';
import { adminApi } from '@/features/admin/api/admin-api';
import { formatPrice } from '@/lib/format';
import type { DashboardStats } from '@/types/admin.types';

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      setLoading(true);
      const data = await adminApi.getStats();
      setStats(data);
    } catch (err) {
      setError('Error al cargar estadísticas');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-ink-light">Cargando estadísticas...</div>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="rounded-card bg-error/10 p-4 text-error">
        {error || 'Error al cargar datos'}
      </div>
    );
  }

  return (
    <div>
      <h1 className="mb-8 text-4xl font-bold">Dashboard</h1>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
        {/* Products */}
        <div className="rounded-card bg-white p-6 shadow-card">
          <h3 className="text-sm font-medium text-ink-light">Productos</h3>
          <p className="mt-2 text-3xl font-bold text-accent">{stats.products.total}</p>
          <p className="mt-1 text-sm text-ink-light">
            {stats.products.active} activos • {stats.products.inactive} inactivos
          </p>
          {stats.products.lowStock > 0 && (
            <p className="mt-1 text-sm text-error">⚠️ {stats.products.lowStock} con stock bajo</p>
          )}
        </div>

        {/* Categories */}
        <div className="rounded-card bg-white p-6 shadow-card">
          <h3 className="text-sm font-medium text-ink-light">Categorías</h3>
          <p className="mt-2 text-3xl font-bold text-purple-600">{stats.categories.total}</p>
        </div>

        {/* Orders */}
        <div className="rounded-card bg-white p-6 shadow-card">
          <h3 className="text-sm font-medium text-ink-light">Órdenes</h3>
          <p className="mt-2 text-3xl font-bold text-success">{stats.orders.total}</p>
          <p className="mt-1 text-sm text-ink-light">{stats.orders.pending} pendientes</p>
          <p className="mt-1 text-sm text-success-dark">
            {formatPrice(stats.orders.revenue)} en ventas
          </p>
        </div>

        {/* Reviews */}
        <div className="rounded-card bg-white p-6 shadow-card">
          <h3 className="text-sm font-medium text-ink-light">Reviews</h3>
          <p className="mt-2 text-3xl font-bold text-orange-600">{stats.reviews.total}</p>
          <p className="mt-1 text-sm text-ink-light">
            {stats.reviews.pending} pendientes • {stats.reviews.approved} aprobadas
          </p>
        </div>
      </div>

      {/* Recent Orders */}
      <div className="mt-8 rounded-card bg-white p-6 shadow-card">
        <h2 className="mb-4 text-xl font-bold">Órdenes Recientes</h2>
        {stats.recentOrders.length === 0 ? (
          <p className="text-ink-light">No hay órdenes recientes</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-border">
              <thead>
                <tr>
                  <th className="px-4 py-2 text-left text-sm font-medium text-ink"># Orden</th>
                  <th className="px-4 py-2 text-left text-sm font-medium text-ink">Cliente</th>
                  <th className="px-4 py-2 text-left text-sm font-medium text-ink">Total</th>
                  <th className="px-4 py-2 text-left text-sm font-medium text-ink">Estado</th>
                  <th className="px-4 py-2 text-left text-sm font-medium text-ink">Fecha</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {stats.recentOrders.map((order) => (
                  <tr key={order.id} className="hover:bg-cream">
                    <td className="px-4 py-3 text-sm">{order.orderNumber}</td>
                    <td className="px-4 py-3 text-sm">{order.customerName}</td>
                    <td className="px-4 py-3 text-sm font-medium">{formatPrice(order.total)}</td>
                    <td className="px-4 py-3 text-sm">
                      <span
                        className={`rounded-full px-2 py-1 text-xs ${
                          order.status === 'PENDING'
                            ? 'bg-accent-light text-accent-dark'
                            : 'bg-success/15 text-success-dark'
                        }`}
                      >
                        {order.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-ink-light">
                      {new Date(order.createdAt).toLocaleDateString('es-CO')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Top Products */}
      <div className="mt-8 rounded-card bg-white p-6 shadow-card">
        <h2 className="mb-4 text-xl font-bold">Productos Más Vendidos</h2>
        {stats.topProducts.length === 0 ? (
          <p className="text-ink-light">No hay datos de ventas</p>
        ) : (
          <div className="space-y-3">
            {stats.topProducts.map((product, index) => (
              <div
                key={product.id}
                className="flex items-center justify-between border-b pb-3 last:border-0"
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-accent-light text-sm font-bold text-accent">
                    {index + 1}
                  </span>
                  <div>
                    <p className="font-medium">{product.name}</p>
                    <p className="text-sm text-ink-light">{formatPrice(product.price)}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-success">{product.totalSold} unidades</p>
                  <p className="text-sm text-ink-light">vendidas</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
