'use client';

import { useCart } from '@/features/cart/context/CartContext';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Skeleton } from '@/components/ui/Skeleton';

export default function CartPage() {
  const router = useRouter();
  const { cart, loading, removeItem, updateQuantity, clearCart, getSubtotal } = useCart();
  const [updatingItems, setUpdatingItems] = useState<Set<string>>(new Set());
  const [clearConfirm, setClearConfirm] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleUpdateQuantity = async (itemId: string, newQuantity: number) => {
    if (newQuantity < 1 || newQuantity > 99) return;
    setUpdatingItems((prev) => new Set(prev).add(itemId));
    setErrors((prev) => { const n = { ...prev }; delete n[itemId]; return n; });
    try {
      await updateQuantity(itemId, newQuantity);
    } catch (err: any) {
      setErrors((prev) => ({ ...prev, [itemId]: err.message || 'Error al actualizar' }));
    } finally {
      setUpdatingItems((prev) => { const n = new Set(prev); n.delete(itemId); return n; });
    }
  };

  const handleRemoveItem = async (itemId: string) => {
    try {
      await removeItem(itemId);
    } catch {
      setErrors((prev) => ({ ...prev, [itemId]: 'No se pudo eliminar' }));
    }
  };

  const handleClearCart = async () => {
    try {
      await clearCart();
      setClearConfirm(false);
    } catch {
      setClearConfirm(false);
    }
  };

  if (loading && !cart) {
    return (
      <div className="container-custom py-12">
        <Skeleton className="mb-8 h-10 w-64" />
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          <div className="space-y-4 lg:col-span-2">
            {[1, 2, 3].map((i) => <Skeleton key={i} className="h-28" />)}
          </div>
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  const subtotal = getSubtotal();
  const tax = subtotal * 0.19;
  const total = subtotal + tax;

  return (
    <div className="container-custom py-12">
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900 sm:text-4xl">Carrito</h1>
        <Link href="/products" className="text-sm text-primary-600 hover:underline">
          ← Seguir comprando
        </Link>
      </div>

      {!cart || cart.items.length === 0 ? (
        <div className="rounded-xl bg-white py-20 text-center ring-1 ring-gray-200">
          <svg
            className="mx-auto h-20 w-20 text-gray-300"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
            />
          </svg>
          <h2 className="mt-4 text-xl font-semibold text-gray-900">Tu carrito está vacío</h2>
          <p className="mt-1 text-gray-500">Agrega productos para comenzar tu pedido</p>
          <Link href="/products" className="btn-primary mt-6 inline-flex">
            Ver Productos
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          {/* Productos */}
          <div className="lg:col-span-2">
            <div className="overflow-hidden rounded-xl bg-white ring-1 ring-gray-200">
              <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
                <h2 className="font-semibold text-gray-900">
                  {cart.items.length} {cart.items.length === 1 ? 'producto' : 'productos'}
                </h2>
                {clearConfirm ? (
                  <div className="flex items-center gap-3 text-sm">
                    <span className="text-gray-600">¿Vaciar todo?</span>
                    <button
                      onClick={handleClearCart}
                      className="font-semibold text-red-600 hover:underline"
                    >
                      Sí, vaciar
                    </button>
                    <button
                      onClick={() => setClearConfirm(false)}
                      className="text-gray-500 hover:underline"
                    >
                      Cancelar
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setClearConfirm(true)}
                    className="text-sm text-gray-400 hover:text-red-600 transition-colors"
                  >
                    Vaciar carrito
                  </button>
                )}
              </div>

              <div className="divide-y divide-gray-100">
                {cart.items.map((item) => {
                  const isUpdating = updatingItems.has(item.id);
                  const itemError = errors[item.id];

                  return (
                    <div key={item.id} className="px-6 py-4">
                      <div className="flex gap-4">
                        <div className="h-20 w-20 flex-shrink-0 overflow-hidden rounded-lg product-placeholder" />

                        <div className="flex flex-1 flex-col gap-2">
                          <div className="flex items-start justify-between">
                            <div>
                              <p className="font-semibold text-gray-900">{item.product.name}</p>
                              {item.product.category && (
                                <p className="text-xs text-primary-600">
                                  {item.product.category.name}
                                </p>
                              )}
                            </div>
                            <button
                              onClick={() => handleRemoveItem(item.id)}
                              disabled={isUpdating}
                              className="text-gray-300 transition-colors hover:text-red-500 disabled:opacity-40"
                              aria-label="Eliminar"
                            >
                              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </div>

                          {itemError && (
                            <p className="text-xs text-red-600">{itemError}</p>
                          )}

                          <div className="flex items-center justify-between">
                            <div className="flex items-center overflow-hidden rounded-lg border border-gray-300">
                              <button
                                onClick={() => handleUpdateQuantity(item.id, item.quantity - 1)}
                                disabled={item.quantity <= 1 || isUpdating}
                                className="px-3 py-1.5 text-gray-500 hover:bg-gray-50 disabled:opacity-40"
                              >
                                −
                              </button>
                              <span className="w-10 border-x border-gray-300 py-1.5 text-center text-sm font-medium">
                                {isUpdating ? '…' : item.quantity}
                              </span>
                              <button
                                onClick={() => handleUpdateQuantity(item.id, item.quantity + 1)}
                                disabled={item.quantity >= 99 || isUpdating}
                                className="px-3 py-1.5 text-gray-500 hover:bg-gray-50 disabled:opacity-40"
                              >
                                +
                              </button>
                            </div>

                            <div className="text-right">
                              <p className="text-xs text-gray-400">
                                ${item.price.toLocaleString('es-CO')} c/u
                              </p>
                              <p className="font-bold text-gray-900">
                                ${(item.price * item.quantity).toLocaleString('es-CO')}
                              </p>
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

          {/* Resumen */}
          <div className="lg:col-span-1">
            <div className="sticky top-24 rounded-xl bg-white p-6 ring-1 ring-gray-200">
              <h2 className="mb-5 font-semibold text-gray-900">Resumen del Pedido</h2>

              <div className="space-y-3 border-b border-gray-100 pb-4 text-sm">
                <div className="flex justify-between text-gray-600">
                  <span>Subtotal</span>
                  <span>${subtotal.toLocaleString('es-CO')}</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>IVA (19%)</span>
                  <span>${tax.toLocaleString('es-CO')}</span>
                </div>
              </div>

              <div className="mt-4 flex justify-between font-bold text-gray-900">
                <span>Total</span>
                <span className="text-lg">${total.toLocaleString('es-CO')}</span>
              </div>

              <button
                onClick={() => router.push('/checkout')}
                disabled={loading}
                className="btn-primary mt-6 w-full"
              >
                {loading ? 'Procesando...' : 'Proceder al Pago'}
              </button>

              <p className="mt-3 text-center text-xs text-gray-400">El carrito expira en 24 horas</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
