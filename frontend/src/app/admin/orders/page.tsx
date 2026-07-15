'use client';

import { useEffect, useState } from 'react';
import { apiErrorMessage } from '@/lib/error';
import { ordersApi } from '@/features/orders/api/orders-api';
import { formatPrice } from '@/lib/format';
import type { Order, OrderStatus } from '@/types/order.types';

const STATUS_COLORS: Record<OrderStatus, string> = {
  PENDING: 'bg-accent-light text-accent-dark',
  CONFIRMED: 'bg-accent-light text-accent-dark',
  IN_PROCESS: 'bg-purple-100 text-purple-800',
  READY: 'bg-success/15 text-success-dark',
  DELIVERED: 'bg-cream text-ink',
  CANCELLED: 'bg-error/15 text-error-dark',
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
    } catch (err) {
      alert(apiErrorMessage(err, 'Error al actualizar estado'));
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-ink-light">Cargando órdenes...</div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="mb-8 text-4xl font-bold">Órdenes</h1>

      <div className="rounded-card bg-white shadow-card">
        <table className="min-w-full divide-y divide-border">
          <thead className="bg-cream">
            <tr>
              <th className="px-6 py-3 text-left text-sm font-medium text-ink">Orden #</th>
              <th className="px-6 py-3 text-left text-sm font-medium text-ink">Cliente</th>
              <th className="px-6 py-3 text-left text-sm font-medium text-ink">Teléfono</th>
              <th className="px-6 py-3 text-left text-sm font-medium text-ink">Total</th>
              <th className="px-6 py-3 text-left text-sm font-medium text-ink">Estado</th>
              <th className="px-6 py-3 text-left text-sm font-medium text-ink">Fecha</th>
              <th className="px-6 py-3 text-right text-sm font-medium text-ink">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border bg-white">
            {orders.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-12 text-center text-ink-light">
                  No hay órdenes registradas
                </td>
              </tr>
            ) : (
              orders.map((order) => (
                <tr key={order.id} className="hover:bg-cream">
                  <td className="px-6 py-4 font-mono text-sm">{order.orderNumber}</td>
                  <td className="px-6 py-4">
                    <div className="font-medium">{order.customerName}</div>
                    <div className="text-sm text-ink-light">{order.shippingAddress}</div>
                  </td>
                  <td className="px-6 py-4 text-sm">{order.customerPhone}</td>
                  <td className="px-6 py-4 font-semibold">{formatPrice(order.total)}</td>
                  <td className="px-6 py-4">
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-medium ${STATUS_COLORS[order.status]}`}
                    >
                      {STATUS_LABELS[order.status]}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-ink-light">
                    {new Date(order.createdAt).toLocaleDateString('es-CO')}
                  </td>
                  <td className="space-x-3 px-6 py-4 text-right">
                    <button
                      onClick={() => setDetailOrder(order)}
                      className="text-sm text-ink-light hover:text-ink"
                    >
                      Ver detalle
                    </button>
                    <button
                      onClick={() => openStatusModal(order)}
                      className="text-sm text-accent hover:text-accent-dark"
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
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-card bg-white shadow-xl">
            <div className="sticky top-0 flex items-center justify-between border-b border-border bg-white px-6 py-4">
              <div>
                <h2 className="text-xl font-bold">Orden {detailOrder.orderNumber}</h2>
                <p className="text-sm text-ink-light">
                  {new Date(detailOrder.createdAt).toLocaleString('es-CO')}
                </p>
              </div>
              <button
                onClick={() => setDetailOrder(null)}
                className="text-2xl leading-none text-ink-lighter hover:text-ink-light"
              >
                ×
              </button>
            </div>

            <div className="space-y-6 p-6">
              {/* Customer info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="mb-1 text-xs font-medium uppercase tracking-wide text-ink-light">
                    Cliente
                  </p>
                  <p className="font-medium">{detailOrder.customerName}</p>
                  <p className="text-sm text-ink-light">{detailOrder.customerPhone}</p>
                  {detailOrder.customerEmail && (
                    <p className="text-sm text-ink-light">{detailOrder.customerEmail}</p>
                  )}
                </div>
                <div>
                  <p className="mb-1 text-xs font-medium uppercase tracking-wide text-ink-light">
                    Envío
                  </p>
                  <p className="text-sm">{detailOrder.shippingAddress}</p>
                  <p className="text-sm text-ink-light">{detailOrder.shippingCity}</p>
                  {detailOrder.shippingNotes && (
                    <p className="mt-1 text-sm italic text-ink-light">
                      {detailOrder.shippingNotes}
                    </p>
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
                  className="text-sm text-accent hover:text-accent-dark"
                >
                  Cambiar estado →
                </button>
              </div>

              {/* Items */}
              <div>
                <p className="mb-3 text-xs font-medium uppercase tracking-wide text-ink-light">
                  Productos ({detailOrder.items?.length ?? 0})
                </p>
                <table className="min-w-full divide-y divide-border overflow-hidden rounded-card border border-border">
                  <thead className="bg-cream">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-ink-light">
                        Producto
                      </th>
                      <th className="px-4 py-2 text-center text-xs font-medium text-ink-light">
                        Cant.
                      </th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-ink-light">
                        P. Unit.
                      </th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-ink-light">
                        Subtotal
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border bg-white">
                    {(detailOrder.items ?? []).map((item) => (
                      <tr key={item.id}>
                        <td className="px-4 py-3 text-sm">
                          {item.product?.name ?? `Producto ${item.productId.slice(0, 8)}`}
                        </td>
                        <td className="px-4 py-3 text-center text-sm">{item.quantity}</td>
                        <td className="px-4 py-3 text-right text-sm">{formatPrice(item.price)}</td>
                        <td className="px-4 py-3 text-right text-sm font-medium">
                          {formatPrice(item.price * item.quantity)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Totals */}
              <div className="space-y-1 border-t border-border pt-4 text-sm">
                <div className="flex justify-between">
                  <span className="text-ink-light">Subtotal</span>
                  <span>{formatPrice(detailOrder.subtotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-ink-light">IVA (19%)</span>
                  <span>{formatPrice(detailOrder.tax)}</span>
                </div>
                <div className="flex justify-between border-t border-border pt-1 text-base font-bold">
                  <span>Total</span>
                  <span>{formatPrice(detailOrder.total)}</span>
                </div>
              </div>

              {/* Status history */}
              {detailOrder.statusHistory && detailOrder.statusHistory.length > 0 && (
                <div>
                  <p className="mb-3 text-xs font-medium uppercase tracking-wide text-ink-light">
                    Historial de estados
                  </p>
                  <div className="space-y-2">
                    {detailOrder.statusHistory.map((h) => (
                      <div key={h.id} className="flex items-start gap-3 text-sm">
                        <div className="mt-0.5 h-2 w-2 flex-shrink-0 rounded-full bg-ink-lighter" />
                        <div className="flex-1">
                          <span className="font-medium">
                            {h.fromStatus ? `${STATUS_LABELS[h.fromStatus]} → ` : ''}
                            {STATUS_LABELS[h.toStatus]}
                          </span>
                          {h.notes && (
                            <span className="ml-2 italic text-ink-light">
                              &quot;{h.notes}&quot;
                            </span>
                          )}
                          <div className="text-xs text-ink-lighter">
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
          <div className="w-full max-w-md rounded-card bg-white p-6 shadow-xl">
            <h2 className="mb-4 text-xl font-bold">Cambiar Estado de Orden</h2>

            <div className="mb-4">
              <p className="text-sm text-ink-light">Orden {selectedOrder.orderNumber}</p>
              <p className="font-medium">{selectedOrder.customerName}</p>
              <p className="text-sm">Estado actual: {STATUS_LABELS[selectedOrder.status]}</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium">Nuevo Estado</label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value as OrderStatus)}
                  className="w-full rounded-card border border-border px-3 py-2"
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
                  className="w-full rounded-card border border-border px-3 py-2"
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
                className="rounded-card border border-border px-4 py-2"
              >
                Cancelar
              </button>
              <button
                onClick={handleChangeStatus}
                disabled={!newStatus}
                className="rounded-card bg-accent px-4 py-2 text-white hover:bg-accent-dark disabled:opacity-50"
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
