'use client';

import { useEffect, useState } from 'react';
import { ordersApi } from '@/features/orders/api/orders-api';
import type { Order, OrderStatus } from '@/types/order.types';

const STATUS_COLORS: Record<OrderStatus, string> = {
  PENDING: 'bg-yellow-100 text-yellow-800',
  CONFIRMED: 'bg-blue-100 text-blue-800',
  PREPARING: 'bg-purple-100 text-purple-800',
  READY: 'bg-green-100 text-green-800',
  DELIVERED: 'bg-gray-100 text-gray-800',
  CANCELLED: 'bg-red-100 text-red-800',
};

const STATUS_LABELS: Record<OrderStatus, string> = {
  PENDING: 'Pendiente',
  CONFIRMED: 'Confirmado',
  PREPARING: 'En Preparación',
  READY: 'Listo',
  DELIVERED: 'Entregado',
  CANCELLED: 'Cancelado',
};

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [newStatus, setNewStatus] = useState<OrderStatus | ''>('');
  const [statusNote, setStatusNote] = useState('');

  useEffect(() => {
    loadOrders();
  }, []);

  const loadOrders = async () => {
    try {
      setLoading(true);
      const data = await ordersApi.getAll();
      setOrders(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleChangeStatus = async () => {
    if (!selectedOrder || !newStatus) return;

    try {
      await ordersApi.updateStatus(selectedOrder.id, {
        status: newStatus as OrderStatus,
        note: statusNote || undefined,
      });
      setShowModal(false);
      setSelectedOrder(null);
      setNewStatus('');
      setStatusNote('');
      await loadOrders();
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Error al actualizar estado');
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-gray-500">Cargando órdenes...</div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="mb-8 text-4xl font-bold">Órdenes</h1>

      <div className="rounded-lg bg-white shadow">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">
                Orden #
              </th>
              <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">
                Cliente
              </th>
              <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">
                Teléfono
              </th>
              <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">
                Total
              </th>
              <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">
                Estado
              </th>
              <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">
                Fecha
              </th>
              <th className="px-6 py-3 text-right text-sm font-medium text-gray-700">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {orders.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                  No hay órdenes registradas
                </td>
              </tr>
            ) : (
              orders.map((order) => (
                <tr key={order.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 font-mono text-sm">
                    {order.id.slice(0, 8)}
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-medium">{order.customerName}</div>
                    <div className="text-sm text-gray-500">{order.deliveryAddress}</div>
                  </td>
                  <td className="px-6 py-4 text-sm">{order.customerPhone}</td>
                  <td className="px-6 py-4 font-semibold">
                    ${order.total.toLocaleString('es-CO')}
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-medium ${STATUS_COLORS[order.status]}`}
                    >
                      {STATUS_LABELS[order.status]}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {new Date(order.createdAt).toLocaleDateString('es-CO')}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => {
                        setSelectedOrder(order);
                        setShowModal(true);
                      }}
                      className="text-blue-600 hover:text-blue-800"
                    >
                      Cambiar Estado
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {showModal && selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <h2 className="mb-4 text-xl font-bold">Cambiar Estado de Orden</h2>

            <div className="mb-4">
              <p className="text-sm text-gray-600">
                Orden #{selectedOrder.id.slice(0, 8)}
              </p>
              <p className="font-medium">{selectedOrder.customerName}</p>
              <p className="text-sm">Estado actual: {STATUS_LABELS[selectedOrder.status]}</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium">Nuevo Estado</label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value as OrderStatus)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2"
                >
                  <option value="">Seleccionar...</option>
                  <option value="CONFIRMED">Confirmado</option>
                  <option value="PREPARING">En Preparación</option>
                  <option value="READY">Listo</option>
                  <option value="DELIVERED">Entregado</option>
                  <option value="CANCELLED">Cancelado</option>
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">Nota (opcional)</label>
                <textarea
                  value={statusNote}
                  onChange={(e) => setStatusNote(e.target.value)}
                  rows={3}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2"
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowModal(false);
                  setSelectedOrder(null);
                  setNewStatus('');
                  setStatusNote('');
                }}
                className="rounded-lg border border-gray-300 px-4 py-2"
              >
                Cancelar
              </button>
              <button
                onClick={handleChangeStatus}
                disabled={!newStatus}
                className="rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
              >
                Actualizar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
