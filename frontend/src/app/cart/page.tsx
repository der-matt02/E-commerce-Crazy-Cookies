'use client';

import { useCart } from '@/features/cart/context/CartContext';
import Link from 'next/link';
import { useState } from 'react';

export default function CartPage() {
  const { cart, loading, removeItem, updateQuantity, clearCart, getSubtotal } =
    useCart();
  const [updatingItems, setUpdatingItems] = useState<Set<string>>(new Set());

  const handleUpdateQuantity = async (itemId: string, newQuantity: number) => {
    if (newQuantity < 1 || newQuantity > 99) return;

    setUpdatingItems((prev) => new Set(prev).add(itemId));
    try {
      await updateQuantity(itemId, newQuantity);
    } catch (err: any) {
      alert(err.message || 'Error al actualizar cantidad');
    } finally {
      setUpdatingItems((prev) => {
        const next = new Set(prev);
        next.delete(itemId);
        return next;
      });
    }
  };

  const handleRemoveItem = async (itemId: string, productName: string) => {
    if (!confirm(`¿Eliminar "${productName}" del carrito?`)) return;

    try {
      await removeItem(itemId);
    } catch (err: any) {
      alert('Error al eliminar producto');
    }
  };

  const handleClearCart = async () => {
    if (!confirm('¿Vaciar todo el carrito?')) return;

    try {
      await clearCart();
    } catch (err: any) {
      alert('Error al vaciar carrito');
    }
  };

  if (loading && !cart) {
    return (
      <div className="container mx-auto px-4 py-12">
        <div className="flex h-64 items-center justify-center">
          <div className="text-gray-500">Cargando carrito...</div>
        </div>
      </div>
    );
  }

  const subtotal = getSubtotal();
  const tax = subtotal * 0.19; // IVA 19%
  const total = subtotal + tax;

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-4xl font-bold">Carrito de Compras</h1>
        <Link
          href="/"
          className="text-blue-600 hover:text-blue-800 hover:underline"
        >
          ← Seguir comprando
        </Link>
      </div>

      {!cart || cart.items.length === 0 ? (
        <div className="rounded-lg bg-white p-12 text-center shadow">
          <svg
            className="mx-auto h-24 w-24 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
            />
          </svg>
          <h2 className="mt-4 text-2xl font-semibold text-gray-900">
            Tu carrito está vacío
          </h2>
          <p className="mt-2 text-gray-600">
            Agrega productos para comenzar tu pedido
          </p>
          <Link
            href="/"
            className="mt-6 inline-block rounded-lg bg-blue-600 px-6 py-3 text-white hover:bg-blue-700"
          >
            Ver Productos
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          {/* Lista de productos */}
          <div className="lg:col-span-2">
            <div className="rounded-lg bg-white shadow">
              <div className="border-b border-gray-200 p-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold">
                    {cart.items.length} {cart.items.length === 1 ? 'Producto' : 'Productos'}
                  </h2>
                  {cart.items.length > 0 && (
                    <button
                      onClick={handleClearCart}
                      className="text-sm text-red-600 hover:text-red-800"
                    >
                      Vaciar carrito
                    </button>
                  )}
                </div>
              </div>

              <div className="divide-y divide-gray-200">
                {cart.items.map((item) => {
                  const isUpdating = updatingItems.has(item.id);

                  return (
                    <div key={item.id} className="p-4">
                      <div className="flex gap-4">
                        {/* Placeholder de imagen */}
                        <div className="h-24 w-24 flex-shrink-0 rounded-lg bg-gray-200"></div>

                        {/* Información del producto */}
                        <div className="flex flex-1 flex-col">
                          <div className="flex justify-between">
                            <div>
                              <h3 className="font-semibold text-gray-900">
                                {item.product.name}
                              </h3>
                              <p className="text-sm text-gray-600">
                                {item.product.category?.name}
                              </p>
                            </div>
                            <button
                              onClick={() =>
                                handleRemoveItem(item.id, item.product.name)
                              }
                              className="text-gray-400 hover:text-red-600"
                              disabled={isUpdating}
                            >
                              <svg
                                className="h-5 w-5"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M6 18L18 6M6 6l12 12"
                                />
                              </svg>
                            </button>
                          </div>

                          <div className="mt-auto flex items-center justify-between">
                            {/* Controles de cantidad */}
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() =>
                                  handleUpdateQuantity(item.id, item.quantity - 1)
                                }
                                disabled={item.quantity <= 1 || isUpdating}
                                className="rounded border border-gray-300 px-2 py-1 hover:bg-gray-100 disabled:opacity-50"
                              >
                                -
                              </button>
                              <span className="w-12 text-center font-medium">
                                {item.quantity}
                              </span>
                              <button
                                onClick={() =>
                                  handleUpdateQuantity(item.id, item.quantity + 1)
                                }
                                disabled={item.quantity >= 99 || isUpdating}
                                className="rounded border border-gray-300 px-2 py-1 hover:bg-gray-100 disabled:opacity-50"
                              >
                                +
                              </button>
                            </div>

                            {/* Precio */}
                            <div className="text-right">
                              <div className="text-sm text-gray-600">
                                ${item.priceAtAdd.toLocaleString('es-CO')} c/u
                              </div>
                              <div className="text-lg font-bold text-gray-900">
                                $
                                {(item.priceAtAdd * item.quantity).toLocaleString(
                                  'es-CO'
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Resumen del pedido */}
          <div className="lg:col-span-1">
            <div className="sticky top-4 rounded-lg bg-white p-6 shadow">
              <h2 className="mb-4 text-lg font-semibold">Resumen del Pedido</h2>

              <div className="space-y-3 border-b border-gray-200 pb-4">
                <div className="flex justify-between text-gray-600">
                  <span>Subtotal</span>
                  <span>${subtotal.toLocaleString('es-CO')}</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>IVA (19%)</span>
                  <span>${tax.toLocaleString('es-CO')}</span>
                </div>
              </div>

              <div className="mt-4 flex justify-between text-lg font-bold">
                <span>Total</span>
                <span>${total.toLocaleString('es-CO')}</span>
              </div>

              <button
                disabled={loading}
                className="mt-6 w-full rounded-lg bg-green-600 py-3 font-semibold text-white hover:bg-green-700 disabled:opacity-50"
              >
                {loading ? 'Procesando...' : 'Proceder al Pago'}
              </button>

              <p className="mt-4 text-center text-sm text-gray-500">
                El carrito expira en 24 horas
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
