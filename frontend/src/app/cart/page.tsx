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
      <div className="mx-auto max-w-7xl px-6 py-16 lg:px-12">
        <Skeleton className="mb-10 h-8 w-48" />
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          <div className="space-y-px lg:col-span-2">
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
    <div className="mx-auto max-w-7xl px-6 py-16 lg:px-12">
      {/* Encabezado */}
      <div className="mb-10 flex items-baseline justify-between">
        <h1 className="font-serif text-[28px] font-light text-ink">Carrito</h1>
        <Link
          href="/products"
          className="font-sans text-[13px] text-ink-light underline underline-offset-2 transition-colors hover:text-ink"
        >
          ← Seguir comprando
        </Link>
      </div>

      {!cart || cart.items.length === 0 ? (
        /* Carrito vacío */
        <div className="border border-ink/10 py-24 text-center">
          <svg
            className="mx-auto mb-6 h-14 w-14 text-ink-lighter"
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
          <p className="mb-1 font-serif text-[22px] font-light text-ink">
            Tu carrito está vacío
          </p>
          <p className="mb-8 font-sans text-[14px] text-ink-light">
            Agrega productos para comenzar tu pedido
          </p>
          <Link href="/products" className="btn-primary">
            Ver Productos
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          {/* Lista de productos */}
          <div className="lg:col-span-2">
            <div className="border border-ink/10 bg-white">
              {/* Header */}
              <div className="flex items-center justify-between border-b border-ink/10 px-6 py-4">
                <p className="font-sans text-[13px] text-ink-light">
                  {cart.items.length} {cart.items.length === 1 ? 'producto' : 'productos'}
                </p>
                {clearConfirm ? (
                  <div className="flex items-center gap-3 font-sans text-[13px]">
                    <span className="text-ink-light">¿Vaciar todo?</span>
                    <button
                      onClick={handleClearCart}
                      className="text-red-600 underline underline-offset-2"
                    >
                      Sí, vaciar
                    </button>
                    <button
                      onClick={() => setClearConfirm(false)}
                      className="text-ink-lighter underline underline-offset-2"
                    >
                      Cancelar
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setClearConfirm(true)}
                    className="font-sans text-[12px] text-ink-lighter transition-colors hover:text-red-600"
                  >
                    Vaciar carrito
                  </button>
                )}
              </div>

              {/* Items */}
              <div className="divide-y divide-ink/10">
                {cart.items.map((item) => {
                  const isUpdating = updatingItems.has(item.id);
                  const itemError = errors[item.id];

                  return (
                    <div key={item.id} className="px-6 py-5">
                      <div className="flex gap-5">
                        {/* Imagen placeholder */}
                        <div
                          className="h-20 w-20 flex-shrink-0"
                          style={{ background: '#F0EBE3' }}
                        />

                        <div className="flex flex-1 flex-col gap-2">
                          <div className="flex items-start justify-between">
                            <div>
                              <p className="font-serif text-[15px] text-ink">{item.product.name}</p>
                              {item.product.category && (
                                <p className="microlabel mt-0.5">{item.product.category.name}</p>
                              )}
                            </div>
                            <button
                              onClick={() => handleRemoveItem(item.id)}
                              disabled={isUpdating}
                              className="text-ink-lighter transition-colors hover:text-red-500 disabled:opacity-40"
                              aria-label="Eliminar"
                            >
                              <svg
                                className="h-4 w-4"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={1.5}
                                  d="M6 18L18 6M6 6l12 12"
                                />
                              </svg>
                            </button>
                          </div>

                          {itemError && (
                            <p className="font-sans text-[11px] text-red-600">{itemError}</p>
                          )}

                          <div className="flex items-center justify-between">
                            {/* Stepper */}
                            <div className="flex items-center overflow-hidden rounded-[2px] border border-ink/20">
                              <button
                                onClick={() => handleUpdateQuantity(item.id, item.quantity - 1)}
                                disabled={item.quantity <= 1 || isUpdating}
                                className="px-3 py-1.5 font-sans text-[14px] text-ink-light hover:bg-cream-dark disabled:opacity-40"
                              >
                                −
                              </button>
                              <span className="w-10 border-x border-ink/20 py-1.5 text-center font-sans text-[13px] font-medium text-ink">
                                {isUpdating ? '…' : item.quantity}
                              </span>
                              <button
                                onClick={() => handleUpdateQuantity(item.id, item.quantity + 1)}
                                disabled={item.quantity >= 99 || isUpdating}
                                className="px-3 py-1.5 font-sans text-[14px] text-ink-light hover:bg-cream-dark disabled:opacity-40"
                              >
                                +
                              </button>
                            </div>

                            <div className="text-right">
                              <p className="font-sans text-[11px] text-ink-lighter">
                                ${item.price.toLocaleString('es-CO')} c/u
                              </p>
                              <p className="font-serif text-[15px] font-medium text-ink">
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
            <div className="sticky top-24 border border-ink/10 bg-white p-6">
              <h2 className="mb-6 font-serif text-[18px] font-light text-ink">
                Resumen del Pedido
              </h2>

              <div className="space-y-3 border-b border-ink/10 pb-4">
                <div className="flex justify-between font-sans text-[13px] text-ink-light">
                  <span>Subtotal</span>
                  <span>${subtotal.toLocaleString('es-CO')}</span>
                </div>
                <div className="flex justify-between font-sans text-[13px] text-ink-light">
                  <span>IVA (19%)</span>
                  <span>${tax.toLocaleString('es-CO')}</span>
                </div>
              </div>

              <div className="mt-4 flex justify-between">
                <span className="font-sans text-[13px] font-medium text-ink">Total</span>
                <span className="font-serif text-[18px] font-medium text-ink">
                  ${total.toLocaleString('es-CO')}
                </span>
              </div>

              <button
                onClick={() => router.push('/checkout')}
                disabled={loading}
                className="btn-full mt-6"
              >
                {loading ? 'Procesando...' : 'Proceder al Pago'}
              </button>

              <p className="mt-4 text-center font-sans text-[11px] text-ink-lighter">
                El carrito expira en 24 horas
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
