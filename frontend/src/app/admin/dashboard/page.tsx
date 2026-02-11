'use client';

import { useEffect, useState } from 'react';
import { adminApi } from '@/features/admin/api/admin-api';
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
        <div className="text-gray-500">Cargando estadísticas...</div>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="rounded-lg bg-red-50 p-4 text-red-600">
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
        <div className="rounded-lg bg-white p-6 shadow">
          <h3 className="text-sm font-medium text-gray-500">Productos</h3>
          <p className="mt-2 text-3xl font-bold text-blue-600">{stats.products.total}</p>
          <p className="mt-1 text-sm text-gray-600">
            {stats.products.active} activos • {stats.products.inactive} inactivos
          </p>
          {stats.products.lowStock > 0 && (
            <p className="mt-1 text-sm text-red-600">⚠️ {stats.products.lowStock} con stock bajo</p>
          )}
        </div>

        {/* Categories */}
        <div className="rounded-lg bg-white p-6 shadow">
          <h3 className="text-sm font-medium text-gray-500">Categorías</h3>
          <p className="mt-2 text-3xl font-bold text-purple-600">{stats.categories.total}</p>
        </div>

        {/* Orders */}
        <div className="rounded-lg bg-white p-6 shadow">
          <h3 className="text-sm font-medium text-gray-500">Órdenes</h3>
          <p className="mt-2 text-3xl font-bold text-green-600">{stats.orders.total}</p>
          <p className="mt-1 text-sm text-gray-600">{stats.orders.pending} pendientes</p>
          <p className="mt-1 text-sm text-green-700">
            ${stats.orders.revenue.toLocaleString('es-CO')} en ventas
          </p>
        </div>

        {/* Reviews */}
        <div className="rounded-lg bg-white p-6 shadow">
          <h3 className="text-sm font-medium text-gray-500">Reviews</h3>
          <p className="mt-2 text-3xl font-bold text-orange-600">{stats.reviews.total}</p>
          <p className="mt-1 text-sm text-gray-600">
            {stats.reviews.pending} pendientes • {stats.reviews.approved} aprobadas
          </p>
        </div>
      </div>

      {/* Recent Orders */}
      <div className="mt-8 rounded-lg bg-white p-6 shadow">
        <h2 className="mb-4 text-xl font-bold">Órdenes Recientes</h2>
        {stats.recentOrders.length === 0 ? (
          <p className="text-gray-500">No hay órdenes recientes</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr>
                  <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">
                    # Orden
                  </th>
                  <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">
                    Cliente
                  </th>
                  <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">
                    Total
                  </th>
                  <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">
                    Estado
                  </th>
                  <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">
                    Fecha
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {stats.recentOrders.map((order) => (
                  <tr key={order.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm">{order.orderNumber}</td>
                    <td className="px-4 py-3 text-sm">{order.customerName}</td>
                    <td className="px-4 py-3 text-sm font-medium">
                      ${order.total.toLocaleString('es-CO')}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <span
                        className={`rounded-full px-2 py-1 text-xs ${
                          order.status === 'PENDING'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-green-100 text-green-800'
                        }`}
                      >
                        {order.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
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
      <div className="mt-8 rounded-lg bg-white p-6 shadow">
        <h2 className="mb-4 text-xl font-bold">Productos Más Vendidos</h2>
        {stats.topProducts.length === 0 ? (
          <p className="text-gray-500">No hay datos de ventas</p>
        ) : (
          <div className="space-y-3">
            {stats.topProducts.map((product, index) => (
              <div
                key={product.id}
                className="flex items-center justify-between border-b pb-3 last:border-0"
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-sm font-bold text-blue-600">
                    {index + 1}
                  </span>
                  <div>
                    <p className="font-medium">{product.name}</p>
                    <p className="text-sm text-gray-500">
                      ${product.price.toLocaleString('es-CO')}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-green-600">{product.totalSold} unidades</p>
                  <p className="text-sm text-gray-500">vendidas</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
