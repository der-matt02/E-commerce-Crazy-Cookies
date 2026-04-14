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

  const handleUpdateQuantity = async (itemId: string, newQty: number) => {
    if (newQty < 1 || newQty > 99) return;
    setUpdatingItems((prev) => new Set(prev).add(itemId));
    setErrors((prev) => { const n = { ...prev }; delete n[itemId]; return n; });
    try {
      await updateQuantity(itemId, newQty);
    } catch (err: any) {
      setErrors((prev) => ({ ...prev, [itemId]: err.message || 'Error al actualizar' }));
    } finally {
      setUpdatingItems((prev) => { const n = new Set(prev); n.delete(itemId); return n; });
    }
  };

  const handleRemoveItem = async (itemId: string) => {
    try { await removeItem(itemId); }
    catch { setErrors((prev) => ({ ...prev, [itemId]: 'No se pudo eliminar' })); }
  };

  const handleClearCart = async () => {
    try { await clearCart(); setClearConfirm(false); }
    catch { setClearConfirm(false); }
  };

  if (loading && !cart) {
    return (
      <div className="cart-page">
        <Skeleton className="" style={{ height: 32, width: 200, marginBottom: 40 }} />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 32 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {[1, 2, 3].map((i) => <Skeleton key={i} className="" style={{ height: 112 }} />)}
          </div>
          <Skeleton className="" style={{ height: 280 }} />
        </div>
      </div>
    );
  }

  const subtotal = getSubtotal();
  const tax = subtotal * 0.19;
  const total = subtotal + tax;

  return (
    <div className="cart-page">
      <div className="cart-page__header">
        <h1 className="cart-page__title">Carrito</h1>
        <Link href="/products" className="cart-page__back-link">← Seguir comprando</Link>
      </div>

      {!cart || cart.items.length === 0 ? (
        <div className="cart-page__empty">
          <svg className="cart-page__empty-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
          <p className="cart-page__empty-title">Tu carrito está vacío</p>
          <p className="cart-page__empty-text">Agrega productos para comenzar tu pedido</p>
          <Link href="/products" className="btn-primary">Ver Productos</Link>
        </div>
      ) : (
        <div className="cart-page__layout">
          {/* Lista */}
          <div className="cart-list">
            <div className="cart-list__header">
              <span className="cart-list__count">
                {cart.items.length} {cart.items.length === 1 ? 'producto' : 'productos'}
              </span>
              {clearConfirm ? (
                <div className="cart-list__confirm">
                  <span className="cart-list__confirm-text">¿Vaciar todo?</span>
                  <button className="cart-list__confirm-yes" onClick={handleClearCart}>Sí, vaciar</button>
                  <button className="cart-list__confirm-no" onClick={() => setClearConfirm(false)}>Cancelar</button>
                </div>
              ) : (
                <button className="cart-list__clear-btn" onClick={() => setClearConfirm(true)}>
                  Vaciar carrito
                </button>
              )}
            </div>

            <div className="cart-list__items">
              {cart.items.map((item) => {
                const isUpdating = updatingItems.has(item.id);
                const itemError = errors[item.id];

                return (
                  <div key={item.id} className="cart-item">
                    <div className="cart-item__inner">
                      <div className="cart-item__image" />
                      <div className="cart-item__content">
                        <div className="cart-item__top">
                          <div>
                            <p className="cart-item__name">{item.product.name}</p>
                            {item.product.category && (
                              <p className="cart-item__category">{item.product.category.name}</p>
                            )}
                          </div>
                          <button
                            className="cart-item__remove-btn"
                            onClick={() => handleRemoveItem(item.id)}
                            disabled={isUpdating}
                            aria-label="Eliminar"
                          >
                            <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>

                        {itemError && <p className="cart-item__error">{itemError}</p>}

                        <div className="cart-item__bottom">
                          <div className="qty-stepper">
                            <button
                              className="qty-stepper__btn"
                              onClick={() => handleUpdateQuantity(item.id, item.quantity - 1)}
                              disabled={item.quantity <= 1 || isUpdating}
                            >−</button>
                            <span className="qty-stepper__value">
                              {isUpdating ? '…' : item.quantity}
                            </span>
                            <button
                              className="qty-stepper__btn"
                              onClick={() => handleUpdateQuantity(item.id, item.quantity + 1)}
                              disabled={item.quantity >= 99 || isUpdating}
                            >+</button>
                          </div>
                          <div className="cart-item-price">
                            <p className="cart-item-price__unit">
                              ${item.price.toLocaleString('es-CO')} c/u
                            </p>
                            <p className="cart-item-price__total">
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

          {/* Resumen */}
          <div className="order-summary">
            <h2 className="order-summary__title">Resumen del Pedido</h2>
            <div className="order-summary__lines">
              <div className="order-summary__line">
                <span>Subtotal</span>
                <span>${subtotal.toLocaleString('es-CO')}</span>
              </div>
              <div className="order-summary__line">
                <span>IVA (19%)</span>
                <span>${tax.toLocaleString('es-CO')}</span>
              </div>
            </div>
            <div className="order-summary__total-row">
              <span className="order-summary__total-label">Total</span>
              <span className="order-summary__total-value">${total.toLocaleString('es-CO')}</span>
            </div>
            <button
              onClick={() => router.push('/checkout')}
              disabled={loading}
              className="btn-full"
            >
              {loading ? 'Procesando...' : 'Proceder al Pago'}
            </button>
            <p className="order-summary__note">El carrito expira en 24 horas</p>
          </div>
        </div>
      )}
    </div>
  );
}
