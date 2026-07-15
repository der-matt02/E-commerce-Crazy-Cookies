'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ordersApi } from '@/features/orders/api/orders-api';
import { WHATSAPP_PHONE } from '@/lib/constants';
import { formatPrice } from '@/lib/format';
import type { Order } from '@/types/order.types';

export default function OrderSuccessPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const isLookup = searchParams.get('lookup') === '1';
  const orderId = params.id as string;
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);

  const loadOrder = useCallback(async () => {
    try {
      const data = await ordersApi.getOne(orderId);
      setOrder(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    loadOrder();
  }, [loadOrder]);

  const getWhatsAppLink = () => {
    if (!order) return '';

    const message = `Hola! Quiero confirmar mi pedido en Crazy Cookies.\n\nOrden: ${order.orderNumber}\nTotal a pagar contra entrega: ${formatPrice(order.total)}\nDirección de entrega: ${order.shippingAddress}\n\n¿Podemos confirmar el pedido y coordinar la entrega?`;

    return `https://wa.me/${WHATSAPP_PHONE}?text=${encodeURIComponent(message)}`;
  };

  if (loading) {
    return (
      <div className="page-narrow">
        <p className="page-narrow__subtitle" style={{ textAlign: 'center' }}>
          Cargando orden...
        </p>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="page-narrow">
        <div className="page-card" style={{ textAlign: 'center' }}>
          <h1 className="page-narrow__title">Orden no encontrada</h1>
        </div>
      </div>
    );
  }

  return (
    <div className="page-narrow">
      <div className="page-card">
        <div className="status-icon status-icon--success">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>

        <div className="status-header">
          <h1 className="status-header__title">{isLookup ? 'Tu pedido' : '¡Pedido confirmado!'}</h1>
          <p className="status-header__subtitle">
            Pedido #{order.orderNumber} ·{' '}
            {isLookup ? 'este es el estado actual' : 'te contactaremos pronto'}
          </p>
        </div>

        <div className="delivery-block" style={{ marginBottom: 16 }}>
          <p className="delivery-block__title">Cliente</p>
          <p className="delivery-block__text">
            {order.customerName} · {order.customerPhone}
          </p>
          <p className="delivery-block__title" style={{ marginTop: 10 }}>
            Dirección
          </p>
          <p className="delivery-block__text">{order.shippingAddress}</p>
        </div>

        <div className="order-summary">
          <div className="order-summary__lines">
            {order.items.map((item) => (
              <div key={item.id} className="order-summary__line">
                <span className="order-summary__line-label">
                  {item.quantity}× {item.product.name}
                </span>
                <span className="order-summary__line-value">
                  {formatPrice(Number(item.price) * item.quantity)}
                </span>
              </div>
            ))}
          </div>

          <div className="order-summary__totals">
            <div className="order-summary__line">
              <span className="order-summary__line-label">Subtotal</span>
              <span className="order-summary__line-value">{formatPrice(order.subtotal)}</span>
            </div>
            <div className="order-summary__line">
              <span className="order-summary__line-label">IVA (19%)</span>
              <span className="order-summary__line-value">{formatPrice(order.tax)}</span>
            </div>
            {Number(order.discount) > 0 && (
              <div className="order-summary__line order-summary__discount">
                <span>Descuento {order.couponCode ? `(${order.couponCode})` : ''}</span>
                <span>-{formatPrice(order.discount)}</span>
              </div>
            )}
            <div className="order-summary__total">
              <span>Total</span>
              <span>{formatPrice(order.total)}</span>
            </div>
          </div>
        </div>

        <a
          href={getWhatsAppLink()}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-whatsapp"
          style={{ marginTop: 20 }}
        >
          <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L0 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
          </svg>
          Confirmar pedido por WhatsApp
        </a>

        <button
          type="button"
          onClick={() => router.push('/products')}
          className="btn-full-secondary"
          style={{ marginTop: 10 }}
        >
          Volver al catálogo
        </button>

        <p
          className="page-narrow__subtitle"
          style={{ textAlign: 'center', marginTop: 14, marginBottom: 0 }}
        >
          Tu pedido se confirma y se paga contra entrega por WhatsApp.
        </p>
      </div>

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 8,
          marginTop: 16,
        }}
      >
        <Link href="/" className="order-summary__edit-link">
          ← Volver al inicio
        </Link>
        {!isLookup && (
          <Link
            href="/pedidos/buscar"
            className="delivery-block__text"
            style={{ textDecoration: 'underline' }}
          >
            Guarda tu número de orden — puedes buscar este pedido después aquí
          </Link>
        )}
      </div>
    </div>
  );
}
