'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { apiErrorMessage } from '@/lib/error';
import { useCart } from '@/features/cart/context/CartContext';
import { ordersApi } from '@/features/orders/api/orders-api';
import { couponsApi } from '@/features/coupons/api/coupons-api';
import { formatPrice } from '@/lib/format';
import type { CreateOrderDto } from '@/types/order.types';

export default function CheckoutPage() {
  const router = useRouter();
  const { cart, getSubtotal } = useCart();
  const [step, setStep] = useState<'form' | 'review'>('form');
  const [loading, setLoading] = useState(false);
  const [orderError, setOrderError] = useState<string | null>(null);
  const [formData, setFormData] = useState<CreateOrderDto>({
    customerName: '',
    customerPhone: '',
    customerEmail: '',
    deliveryAddress: '',
    notes: '',
  });

  const [couponInput, setCouponInput] = useState('');
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [appliedCoupon, setAppliedCoupon] = useState<{ code: string; discount: number } | null>(
    null
  );

  const subtotal = getSubtotal();
  const tax = subtotal * 0.19;
  const discount = appliedCoupon?.discount || 0;
  const total = subtotal + tax - discount;

  const handleApplyCoupon = async () => {
    if (!couponInput.trim()) return;

    setCouponLoading(true);
    setCouponError(null);

    try {
      const result = await couponsApi.validate(couponInput.trim(), subtotal);
      setAppliedCoupon({ code: result.coupon.code, discount: result.discount });
    } catch (err) {
      setAppliedCoupon(null);
      setCouponError(apiErrorMessage(err, 'Cupón inválido'));
    } finally {
      setCouponLoading(false);
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponInput('');
    setCouponError(null);
  };

  const handleReview = (e: React.FormEvent) => {
    e.preventDefault();
    setStep('review');
  };

  const handleConfirm = async () => {
    setOrderError(null);

    if (!cart || cart.items.length === 0) {
      setOrderError('El carrito está vacío');
      return;
    }

    setLoading(true);

    try {
      const sessionId = localStorage.getItem('cart_session_id');
      if (!sessionId) {
        throw new Error('No se encontró la sesión del carrito');
      }

      const order = await ordersApi.create(sessionId, {
        ...formData,
        couponCode: appliedCoupon?.code,
      });
      router.push(`/order/${order.id}/success`);
    } catch (err) {
      setOrderError(apiErrorMessage(err, 'Error al crear la orden'));
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (!cart || cart.items.length === 0) {
    return (
      <div className="page-narrow">
        <div className="page-card" style={{ textAlign: 'center' }}>
          <h1 className="page-narrow__title">El carrito está vacío</h1>
          <p className="page-narrow__subtitle">Agrega productos antes de proceder al checkout</p>
          <button onClick={() => router.push('/')} className="btn-primary">
            Ver productos
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="page-narrow">
      <div className="page-card">
        <div className="step-indicator">
          <span
            className={`step-indicator__step ${step === 'form' ? 'step-indicator__step--active' : 'step-indicator__step--done'}`}
          >
            Datos
          </span>
          <span
            className={`step-indicator__line ${step === 'review' ? 'step-indicator__line--done' : ''}`}
          />
          <span
            className={`step-indicator__step ${step === 'review' ? 'step-indicator__step--active' : ''}`}
          >
            Revisión
          </span>
          <span className="step-indicator__line" />
          <span className="step-indicator__step">Confirmar</span>
        </div>

        {step === 'form' ? (
          <form onSubmit={handleReview}>
            <h1 className="page-narrow__title">Información de entrega</h1>

            <div className="form-group">
              <label className="form-label">Nombre completo *</label>
              <input
                type="text"
                className="form-input"
                value={formData.customerName}
                onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                required
                minLength={3}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Teléfono *</label>
              <input
                type="tel"
                className="form-input"
                value={formData.customerPhone}
                onChange={(e) => setFormData({ ...formData, customerPhone: e.target.value })}
                required
                pattern="[0-9]{10}"
                placeholder="3001234567"
              />
              <p className="form-error" style={{ color: 'var(--ink-lighter)' }}>
                10 dígitos sin espacios
              </p>
            </div>

            <div className="form-group">
              <label className="form-label">Email (opcional)</label>
              <input
                type="email"
                className="form-input"
                value={formData.customerEmail}
                onChange={(e) => setFormData({ ...formData, customerEmail: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Dirección de entrega *</label>
              <textarea
                className="form-input"
                value={formData.deliveryAddress}
                onChange={(e) => setFormData({ ...formData, deliveryAddress: e.target.value })}
                required
                minLength={10}
                rows={3}
                placeholder="Av. Amazonas N12-34, Piso 2, Quito"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Notas adicionales (opcional)</label>
              <textarea
                className="form-input"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={3}
                placeholder="Instrucciones especiales, horario preferido, etc."
              />
            </div>

            <button type="submit" className="btn-full">
              Revisar pedido
            </button>
          </form>
        ) : (
          <>
            <h1 className="page-narrow__title">Revisa tu pedido</h1>
            <p className="page-narrow__subtitle">
              Confirma que tus datos sean correctos. Si algo está mal, puedes editarlo antes de
              confirmar.
            </p>

            <div className="order-summary" style={{ marginBottom: 16 }}>
              <div className="order-summary__lines">
                {cart.items.map((item) => (
                  <div key={item.id} className="order-summary__line">
                    <span className="order-summary__line-label">
                      {item.quantity}× {item.product.name}
                    </span>
                    <span className="order-summary__line-value">
                      {formatPrice(item.price * item.quantity)}
                    </span>
                  </div>
                ))}
              </div>
              <Link href="/cart" className="order-summary__edit-link">
                Editar carrito
              </Link>
            </div>

            <div className="delivery-block" style={{ marginBottom: 16 }}>
              <p className="delivery-block__title">Entrega</p>
              <p className="delivery-block__text">{formData.deliveryAddress}</p>
            </div>

            <div className="form-group">
              <label className="form-label">Código de cupón</label>
              {appliedCoupon ? (
                <div className="coupon-applied">
                  <span className="coupon-applied__label">Cupón {appliedCoupon.code} aplicado</span>
                  <button
                    type="button"
                    onClick={handleRemoveCoupon}
                    className="coupon-applied__remove"
                  >
                    Quitar
                  </button>
                </div>
              ) : (
                <div>
                  <div className="coupon-row">
                    <input
                      type="text"
                      className="form-input"
                      value={couponInput}
                      onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                      placeholder="Código de cupón"
                    />
                    <button
                      type="button"
                      onClick={handleApplyCoupon}
                      disabled={couponLoading || !couponInput.trim()}
                      className="btn-secondary"
                    >
                      {couponLoading ? 'Validando...' : 'Aplicar'}
                    </button>
                  </div>
                  {couponError && <p className="form-error">{couponError}</p>}
                </div>
              )}
            </div>

            {orderError && <div className="form-banner-error">{orderError}</div>}

            <div className="order-summary__totals">
              <div className="order-summary__line">
                <span className="order-summary__line-label">Subtotal</span>
                <span className="order-summary__line-value">{formatPrice(subtotal)}</span>
              </div>
              <div className="order-summary__line">
                <span className="order-summary__line-label">IVA (19%)</span>
                <span className="order-summary__line-value">{formatPrice(tax)}</span>
              </div>
              {discount > 0 && (
                <div className="order-summary__line order-summary__discount">
                  <span>Descuento</span>
                  <span>-{formatPrice(discount)}</span>
                </div>
              )}
              <div className="order-summary__total">
                <span>Total</span>
                <span>{formatPrice(total)}</span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
              <button
                type="button"
                onClick={() => {
                  setOrderError(null);
                  setStep('form');
                }}
                disabled={loading}
                className="btn-full-secondary"
              >
                ← Editar datos
              </button>
              <button type="button" onClick={handleConfirm} disabled={loading} className="btn-full">
                {loading ? 'Procesando...' : 'Confirmar pedido'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
