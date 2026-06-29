'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiErrorMessage } from '@/lib/error';
import { useCart } from '@/features/cart/context/CartContext';
import { ordersApi } from '@/features/orders/api/orders-api';
import type { CreateOrderDto } from '@/types/order.types';

export default function CheckoutPage() {
  const router = useRouter();
  const { cart, getSubtotal } = useCart();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<CreateOrderDto>({
    customerName: '',
    customerPhone: '',
    customerEmail: '',
    deliveryAddress: '',
    notes: '',
  });

  const subtotal = getSubtotal();
  const tax = subtotal * 0.19;
  const total = subtotal + tax;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!cart || cart.items.length === 0) {
      alert('El carrito está vacío');
      return;
    }

    setLoading(true);

    try {
      const sessionId = localStorage.getItem('cart_session_id');
      if (!sessionId) {
        throw new Error('No se encontró la sesión del carrito');
      }

      const order = await ordersApi.create(sessionId, formData);
      router.push(`/order/${order.id}/success`);
    } catch (err) {
      alert(apiErrorMessage(err, 'Error al crear la orden'));
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (!cart || cart.items.length === 0) {
    return (
      <div className="container mx-auto px-4 py-12">
        <div className="rounded-lg bg-yellow-50 p-8 text-center">
          <h2 className="text-2xl font-semibold">El carrito está vacío</h2>
          <p className="mt-2 text-gray-600">Agrega productos antes de proceder al checkout</p>
          <button
            onClick={() => router.push('/')}
            className="mt-4 rounded-lg bg-blue-600 px-6 py-2 text-white hover:bg-blue-700"
          >
            Ver Productos
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-12">
      <h1 className="mb-8 text-4xl font-bold">Checkout</h1>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* Formulario */}
        <div className="lg:col-span-2">
          <form onSubmit={handleSubmit} className="rounded-lg bg-white p-6 shadow">
            <h2 className="mb-6 text-2xl font-semibold">Información de Entrega</h2>

            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Nombre Completo *
                </label>
                <input
                  type="text"
                  value={formData.customerName}
                  onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                  required
                  minLength={3}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Teléfono *</label>
                <input
                  type="tel"
                  value={formData.customerPhone}
                  onChange={(e) => setFormData({ ...formData, customerPhone: e.target.value })}
                  required
                  pattern="[0-9]{10}"
                  placeholder="3001234567"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2"
                />
                <p className="mt-1 text-xs text-gray-500">10 dígitos sin espacios</p>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Email (opcional)
                </label>
                <input
                  type="email"
                  value={formData.customerEmail}
                  onChange={(e) => setFormData({ ...formData, customerEmail: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Dirección de Entrega *
                </label>
                <textarea
                  value={formData.deliveryAddress}
                  onChange={(e) => setFormData({ ...formData, deliveryAddress: e.target.value })}
                  required
                  minLength={10}
                  rows={3}
                  placeholder="Av. Amazonas N12-34, Piso 2, Quito"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Notas Adicionales (opcional)
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={3}
                  placeholder="Instrucciones especiales, horario preferido, etc."
                  className="w-full rounded-lg border border-gray-300 px-3 py-2"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="mt-6 w-full rounded-lg bg-green-600 py-3 font-semibold text-white hover:bg-green-700 disabled:opacity-50"
            >
              {loading ? 'Procesando...' : 'Confirmar Pedido'}
            </button>
          </form>
        </div>

        {/* Resumen */}
        <div className="lg:col-span-1">
          <div className="sticky top-4 rounded-lg bg-white p-6 shadow">
            <h2 className="mb-4 text-lg font-semibold">Resumen del Pedido</h2>

            <div className="mb-4 space-y-2">
              {cart.items.map((item) => (
                <div key={item.id} className="flex justify-between text-sm">
                  <span>
                    {item.product.name} x{item.quantity}
                  </span>
                  <span>${(item.price * item.quantity).toLocaleString('es-CO')}</span>
                </div>
              ))}
            </div>

            <div className="space-y-2 border-t border-gray-200 pt-4">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span>${subtotal.toLocaleString('es-CO')}</span>
              </div>
              <div className="flex justify-between">
                <span>IVA (19%)</span>
                <span>${tax.toLocaleString('es-CO')}</span>
              </div>
              <div className="flex justify-between border-t border-gray-200 pt-2 text-lg font-bold">
                <span>Total</span>
                <span>${total.toLocaleString('es-CO')}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
