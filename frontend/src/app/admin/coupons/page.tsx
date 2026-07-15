'use client';

import { useEffect, useState } from 'react';
import { apiErrorMessage } from '@/lib/error';
import { couponsApi } from '@/features/coupons/api/coupons-api';
import { formatPrice } from '@/lib/format';
import { CouponType, type Coupon } from '@/types/coupon.types';

interface CouponFormState {
  code: string;
  type: CouponType;
  value: string;
  minPurchase: string;
  maxUses: string;
  isActive: boolean;
  expiresAt: string;
}

const emptyForm: CouponFormState = {
  code: '',
  type: CouponType.PERCENTAGE,
  value: '',
  minPurchase: '',
  maxUses: '',
  isActive: true,
  expiresAt: '',
};

export default function AdminCouponsPage() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null);
  const [formData, setFormData] = useState<CouponFormState>(emptyForm);

  useEffect(() => {
    loadCoupons();
  }, []);

  const loadCoupons = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await couponsApi.getAll();
      setCoupons(data);
    } catch (err) {
      setError(apiErrorMessage(err, 'Error al cargar cupones'));
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingCoupon(null);
    setFormData(emptyForm);
    setShowModal(true);
  };

  const handleEdit = (coupon: Coupon) => {
    setEditingCoupon(coupon);
    setFormData({
      code: coupon.code,
      type: coupon.type,
      value: String(coupon.value),
      minPurchase: coupon.minPurchase ? String(coupon.minPurchase) : '',
      maxUses: coupon.maxUses ? String(coupon.maxUses) : '',
      isActive: coupon.isActive,
      expiresAt: coupon.expiresAt ? coupon.expiresAt.slice(0, 10) : '',
    });
    setShowModal(true);
  };

  const handleDelete = async (id: string, code: string) => {
    if (!confirm(`¿Eliminar el cupón "${code}"?`)) return;

    try {
      await couponsApi.delete(id);
      await loadCoupons();
    } catch (err) {
      alert(apiErrorMessage(err, 'Error al eliminar cupón'));
      console.error(err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const dto = {
      code: formData.code,
      type: formData.type,
      value: Number(formData.value),
      minPurchase: formData.minPurchase ? Number(formData.minPurchase) : undefined,
      maxUses: formData.maxUses ? Number(formData.maxUses) : undefined,
      isActive: formData.isActive,
      expiresAt: formData.expiresAt ? new Date(formData.expiresAt).toISOString() : undefined,
    };

    try {
      if (editingCoupon) {
        await couponsApi.update(editingCoupon.id, dto);
      } else {
        await couponsApi.create(dto);
      }

      setShowModal(false);
      await loadCoupons();
    } catch (err) {
      alert(apiErrorMessage(err, 'Error al guardar cupón'));
      console.error(err);
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-ink-light">Cargando cupones...</div>
      </div>
    );
  }

  if (error) {
    return <div className="rounded-card bg-error/10 p-4 text-error">{error}</div>;
  }

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-4xl font-bold">Cupones</h1>
        <button
          onClick={handleCreate}
          className="rounded-card bg-accent px-4 py-2 font-medium text-white hover:bg-accent-dark"
        >
          + Nuevo Cupón
        </button>
      </div>

      <div className="rounded-card bg-white shadow-card">
        <table className="min-w-full divide-y divide-border">
          <thead className="bg-cream">
            <tr>
              <th className="px-6 py-3 text-left text-sm font-medium text-ink">Código</th>
              <th className="px-6 py-3 text-left text-sm font-medium text-ink">Descuento</th>
              <th className="px-6 py-3 text-left text-sm font-medium text-ink">Mín. compra</th>
              <th className="px-6 py-3 text-left text-sm font-medium text-ink">Usos</th>
              <th className="px-6 py-3 text-left text-sm font-medium text-ink">Expira</th>
              <th className="px-6 py-3 text-left text-sm font-medium text-ink">Estado</th>
              <th className="px-6 py-3 text-right text-sm font-medium text-ink">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border bg-white">
            {coupons.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-12 text-center text-ink-light">
                  No hay cupones registrados
                </td>
              </tr>
            ) : (
              coupons.map((coupon) => (
                <tr key={coupon.id} className="hover:bg-cream">
                  <td className="px-6 py-4 font-medium text-ink">{coupon.code}</td>
                  <td className="px-6 py-4 text-sm text-ink-light">
                    {coupon.type === CouponType.PERCENTAGE
                      ? `${coupon.value}%`
                      : formatPrice(coupon.value)}
                  </td>
                  <td className="px-6 py-4 text-sm text-ink-light">
                    {coupon.minPurchase ? formatPrice(coupon.minPurchase) : '—'}
                  </td>
                  <td className="px-6 py-4 text-sm text-ink-light">
                    {coupon.usedCount}
                    {coupon.maxUses ? ` / ${coupon.maxUses}` : ''}
                  </td>
                  <td className="px-6 py-4 text-sm text-ink-light">
                    {coupon.expiresAt
                      ? new Date(coupon.expiresAt).toLocaleDateString('es-CO')
                      : '—'}
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`rounded-full px-2 py-1 text-xs font-medium ${
                        coupon.isActive ? 'bg-success/15 text-success-dark' : 'bg-cream text-ink'
                      }`}
                    >
                      {coupon.isActive ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right text-sm">
                    <button
                      onClick={() => handleEdit(coupon)}
                      className="mr-3 text-accent hover:text-accent-dark"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => handleDelete(coupon.id, coupon.code)}
                      className="text-error hover:text-error-dark"
                    >
                      Eliminar
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="w-full max-w-lg rounded-card bg-white p-6 shadow-xl">
            <h2 className="mb-6 text-2xl font-bold">
              {editingCoupon ? 'Editar Cupón' : 'Nuevo Cupón'}
            </h2>

            <form onSubmit={handleSubmit}>
              <div className="space-y-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-ink">Código *</label>
                  <input
                    type="text"
                    value={formData.code}
                    onChange={(e) =>
                      setFormData({ ...formData, code: e.target.value.toUpperCase() })
                    }
                    required
                    minLength={3}
                    placeholder="VERANO10"
                    className="w-full rounded-card border border-border px-3 py-2 uppercase focus:border-accent focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-ink">Tipo *</label>
                    <select
                      value={formData.type}
                      onChange={(e) =>
                        setFormData({ ...formData, type: e.target.value as CouponType })
                      }
                      className="w-full rounded-card border border-border px-3 py-2 focus:border-accent focus:outline-none"
                    >
                      <option value={CouponType.PERCENTAGE}>Porcentaje (%)</option>
                      <option value={CouponType.FIXED}>Monto fijo ($)</option>
                    </select>
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-medium text-ink">Valor *</label>
                    <input
                      type="number"
                      value={formData.value}
                      onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                      required
                      min="0.01"
                      step="0.01"
                      placeholder={formData.type === CouponType.PERCENTAGE ? '10' : '5000'}
                      className="w-full rounded-card border border-border px-3 py-2 focus:border-accent focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-ink">Compra mínima</label>
                    <input
                      type="number"
                      value={formData.minPurchase}
                      onChange={(e) => setFormData({ ...formData, minPurchase: e.target.value })}
                      min="0"
                      placeholder="Opcional"
                      className="w-full rounded-card border border-border px-3 py-2 focus:border-accent focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-medium text-ink">Máx. usos</label>
                    <input
                      type="number"
                      value={formData.maxUses}
                      onChange={(e) => setFormData({ ...formData, maxUses: e.target.value })}
                      min="1"
                      placeholder="Ilimitado"
                      className="w-full rounded-card border border-border px-3 py-2 focus:border-accent focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-ink">
                      Fecha de expiración
                    </label>
                    <input
                      type="date"
                      value={formData.expiresAt}
                      onChange={(e) => setFormData({ ...formData, expiresAt: e.target.value })}
                      className="w-full rounded-card border border-border px-3 py-2 focus:border-accent focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-medium text-ink">Estado</label>
                    <div className="flex h-10 items-center">
                      <input
                        type="checkbox"
                        checked={formData.isActive}
                        onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                        className="h-4 w-4 rounded border-border text-accent focus:ring-accent"
                      />
                      <span className="ml-2 text-sm text-ink">Activo</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="rounded-card border border-border px-4 py-2 text-ink hover:bg-cream"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="rounded-card bg-accent px-4 py-2 text-white hover:bg-accent-dark"
                >
                  {editingCoupon ? 'Guardar Cambios' : 'Crear Cupón'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
