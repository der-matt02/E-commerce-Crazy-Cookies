'use client';

import { useEffect, useState } from 'react';
import { ordersApi } from '@/features/orders/api/orders-api';
import type { Order, OrderStatus } from '@/types/order.types';

const STATUS_COLORS: Record<OrderStatus, string> = {
  PENDING: 'bg-yellow-100 text-yellow-800',
  CONFIRMED: 'bg-blue-100 text-blue-800',
  IN_PROCESS: 'bg-purple-100 text-purple-800',
  READY: 'bg-green-100 text-green-800',
  DELIVERED: 'bg-gray-100 text-gray-800',
  CANCELLED: 'bg-red-100 text-red-800',
};

const STATUS_LABELS: Record<OrderStatus, string> = {
  PENDING: 'Pendiente',
  CONFIRMED: 'Confirmado',
  IN_PROCESS: 'En Preparación',
  READY: 'Listo',
  DELIVERED: 'Entregado',
  CANCELLED: 'Cancelado',
};

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [detailOrder, setDetailOrder] = useState<Order | null>(null);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
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

  const openStatusModal = (order: Order) => {
    setSelectedOrder(order);
    setNewStatus('');
    setStatusNote('');
    setShowStatusModal(true);
  };

  const handleChangeStatus = async () => {
    if (!selectedOrder || !newStatus) return;

    try {
      await ordersApi.updateStatus(selectedOrder.id, {
        status: newStatus as OrderStatus,
        note: statusNote || undefined,
      });
      setShowStatusModal(false);
      setSelectedOrder(null);
      setNewStatus('');
      setStatusNote('');
      if (detailOrder?.id === selectedOrder.id) {
        setDetailOrder(null);
      }
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
              <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">Orden #</th>
              <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">Cliente</th>
              <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">Teléfono</th>
              <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">Total</th>
              <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">Estado</th>
              <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">Fecha</th>
              <th className="px-6 py-3 text-right text-sm font-medium text-gray-700">Acciones</th>
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
                  <td className="px-6 py-4 font-mono text-sm">{order.orderNumber}</td>
                  <td className="px-6 py-4">
                    <div className="font-medium">{order.customerName}</div>
                    <div className="text-sm text-gray-500">{order.shippingAddress}</div>
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
                  <td className="space-x-3 px-6 py-4 text-right">
                    <button
                      onClick={() => setDetailOrder(order)}
                      className="text-sm text-gray-600 hover:text-gray-900"
                    >
                      Ver detalle
                    </button>
                    <button
                      onClick={() => openStatusModal(order)}
                      className="text-sm text-blue-600 hover:text-blue-800"
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

      {/* Detail Modal */}
      {detailOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg bg-white shadow-xl">
            <div className="sticky top-0 flex items-center justify-between border-b border-gray-200 bg-white px-6 py-4">
              <div>
                <h2 className="text-xl font-bold">Orden {detailOrder.orderNumber}</h2>
                <p className="text-sm text-gray-500">
                  {new Date(detailOrder.createdAt).toLocaleString('es-CO')}
                </p>
              </div>
              <button
                onClick={() => setDetailOrder(null)}
                className="text-2xl leading-none text-gray-400 hover:text-gray-600"
              >
                ×
              </button>
            </div>

            <div className="space-y-6 p-6">
              {/* Customer info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="mb-1 text-xs font-medium uppercase tracking-wide text-gray-500">
                    Cliente
                  </p>
                  <p className="font-medium">{detailOrder.customerName}</p>
                  <p className="text-sm text-gray-600">{detailOrder.customerPhone}</p>
                  {detailOrder.customerEmail && (
                    <p className="text-sm text-gray-600">{detailOrder.customerEmail}</p>
                  )}
                </div>
                <div>
                  <p className="mb-1 text-xs font-medium uppercase tracking-wide text-gray-500">
                    Envío
                  </p>
                  <p className="text-sm">{detailOrder.shippingAddress}</p>
                  <p className="text-sm text-gray-600">{detailOrder.shippingCity}</p>
                  {detailOrder.shippingNotes && (
                    <p className="mt-1 text-sm italic text-gray-500">{detailOrder.shippingNotes}</p>
                  )}
                </div>
              </div>

              {/* Status badge */}
              <div className="flex items-center gap-3">
                <span
                  className={`rounded-full px-3 py-1 text-xs font-medium ${STATUS_COLORS[detailOrder.status]}`}
                >
                  {STATUS_LABELS[detailOrder.status]}
                </span>
                <button
                  onClick={() => openStatusModal(detailOrder)}
                  className="text-sm text-blue-600 hover:text-blue-800"
                >
                  Cambiar estado →
                </button>
              </div>

              {/* Items */}
              <div>
                <p className="mb-3 text-xs font-medium uppercase tracking-wide text-gray-500">
                  Productos ({detailOrder.items?.length ?? 0})
                </p>
                <table className="min-w-full divide-y divide-gray-200 overflow-hidden rounded-lg border border-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-600">
                        Producto
                      </th>
                      <th className="px-4 py-2 text-center text-xs font-medium text-gray-600">
                        Cant.
                      </th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-600">
                        P. Unit.
                      </th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-600">
                        Subtotal
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white">
                    {(detailOrder.items ?? []).map((item) => (
                      <tr key={item.id}>
                        <td className="px-4 py-3 text-sm">
                          {item.product?.name ?? `Producto ${item.productId.slice(0, 8)}`}
                        </td>
                        <td className="px-4 py-3 text-center text-sm">{item.quantity}</td>
                        <td className="px-4 py-3 text-right text-sm">
                          ${item.price.toLocaleString('es-CO')}
                        </td>
                        <td className="px-4 py-3 text-right text-sm font-medium">
                          ${(item.price * item.quantity).toLocaleString('es-CO')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Totals */}
              <div className="space-y-1 border-t border-gray-200 pt-4 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Subtotal</span>
                  <span>${detailOrder.subtotal.toLocaleString('es-CO')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">IVA (19%)</span>
                  <span>${detailOrder.tax.toLocaleString('es-CO')}</span>
                </div>
                <div className="flex justify-between border-t border-gray-200 pt-1 text-base font-bold">
                  <span>Total</span>
                  <span>${detailOrder.total.toLocaleString('es-CO')}</span>
                </div>
              </div>

              {/* Status history */}
              {detailOrder.statusHistory && detailOrder.statusHistory.length > 0 && (
                <div>
                  <p className="mb-3 text-xs font-medium uppercase tracking-wide text-gray-500">
                    Historial de estados
                  </p>
                  <div className="space-y-2">
                    {detailOrder.statusHistory.map((h) => (
                      <div key={h.id} className="flex items-start gap-3 text-sm">
                        <div className="mt-0.5 h-2 w-2 flex-shrink-0 rounded-full bg-gray-400" />
                        <div className="flex-1">
                          <span className="font-medium">
                            {h.fromStatus ? `${STATUS_LABELS[h.fromStatus]} → ` : ''}
                            {STATUS_LABELS[h.toStatus]}
                          </span>
                          {h.notes && (
                            <span className="ml-2 italic text-gray-500">&quot;{h.notes}&quot;</span>
                          )}
                          <div className="text-xs text-gray-400">
                            {new Date(h.createdAt).toLocaleString('es-CO')}
                            {h.changedBy && ` · ${h.changedBy}`}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Status Change Modal */}
      {showStatusModal && selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <h2 className="mb-4 text-xl font-bold">Cambiar Estado de Orden</h2>

            <div className="mb-4">
              <p className="text-sm text-gray-600">Orden {selectedOrder.orderNumber}</p>
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
                  <option value="IN_PROCESS">En Preparación</option>
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
                  setShowStatusModal(false);
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
