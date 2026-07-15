'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ordersApi } from '@/features/orders/api/orders-api';
import { apiErrorMessage } from '@/lib/error';
import type { LookupOrderDto } from '@/types/order.types';

export default function OrderLookupPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<LookupOrderDto>({
    orderNumber: '',
    customerPhone: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const order = await ordersApi.lookup({
        orderNumber: formData.orderNumber.trim(),
        customerPhone: formData.customerPhone.trim(),
      });
      router.push(`/order/${order.id}/success?lookup=1`);
    } catch (err) {
      setError(apiErrorMessage(err, 'No pudimos encontrar tu pedido'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-narrow">
      <div className="page-card">
        <h1 className="page-narrow__title">Buscar mi pedido</h1>
        <p className="page-narrow__subtitle">
          Ingresa el número de orden que recibiste al comprar y el teléfono que usaste, para
          consultar el estado de tu pedido.
        </p>

        {error && <div className="form-banner-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="orderNumber">
              Número de orden
            </label>
            <input
              id="orderNumber"
              type="text"
              className="form-input"
              placeholder="ORD-1730000000000-AB12"
              value={formData.orderNumber}
              onChange={(e) => setFormData({ ...formData, orderNumber: e.target.value })}
              required
              minLength={5}
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="customerPhone">
              Teléfono
            </label>
            <input
              id="customerPhone"
              type="tel"
              className="form-input"
              placeholder="3001234567"
              value={formData.customerPhone}
              onChange={(e) => setFormData({ ...formData, customerPhone: e.target.value })}
              required
              pattern="[0-9]{10}"
            />
          </div>

          <button type="submit" className="btn-full" disabled={loading}>
            {loading ? 'Buscando...' : 'Buscar pedido'}
          </button>
        </form>
      </div>
    </div>
  );
}
