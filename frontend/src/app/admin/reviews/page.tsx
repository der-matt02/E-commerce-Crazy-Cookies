'use client';

import { useCallback, useEffect, useState } from 'react';
import { reviewsApi } from '@/features/reviews/api/reviews-api';
import type { Review } from '@/types/review.types';
import { apiErrorMessage } from '@/lib/error';

export default function AdminReviewsPage() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved'>('pending');
  const [processing, setProcessing] = useState<Set<string>>(new Set());

  const loadReviews = useCallback(async () => {
    try {
      setLoading(true);
      let data: Review[];

      if (filter === 'pending') {
        data = await reviewsApi.getPending();
      } else if (filter === 'approved') {
        data = await reviewsApi.getAll(true);
      } else {
        data = await reviewsApi.getAll();
      }

      setReviews(data);
    } catch (err) {
      console.error('Error loading reviews:', err);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    loadReviews();
  }, [loadReviews]);

  const handleApprove = async (id: string, isApproved: boolean) => {
    setProcessing((prev) => new Set(prev).add(id));
    try {
      await reviewsApi.approve(id, { isApproved });
      await loadReviews();
    } catch (err) {
      alert(apiErrorMessage(err, 'Error al actualizar review'));
    } finally {
      setProcessing((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  const handleDelete = async (id: string, productName: string) => {
    if (!confirm(`¿Eliminar review del producto "${productName}"?`)) return;

    setProcessing((prev) => new Set(prev).add(id));
    try {
      await reviewsApi.delete(id);
      await loadReviews();
    } catch (err) {
      alert(apiErrorMessage(err, 'Error al eliminar review'));
    } finally {
      setProcessing((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-gray-500">Cargando reviews...</div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="mb-8 text-4xl font-bold">Moderación de Reviews</h1>

      {/* Filtros */}
      <div className="mb-6 flex gap-2">
        <button
          onClick={() => setFilter('pending')}
          className={`rounded-lg px-4 py-2 ${
            filter === 'pending'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          Pendientes
          {filter !== 'pending' && reviews.filter((r) => !r.isApproved).length > 0 && (
            <span className="ml-2 rounded-full bg-red-500 px-2 py-0.5 text-xs text-white">
              {reviews.filter((r) => !r.isApproved).length}
            </span>
          )}
        </button>
        <button
          onClick={() => setFilter('approved')}
          className={`rounded-lg px-4 py-2 ${
            filter === 'approved'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          Aprobadas
        </button>
        <button
          onClick={() => setFilter('all')}
          className={`rounded-lg px-4 py-2 ${
            filter === 'all'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          Todas
        </button>
      </div>

      {/* Lista de reviews */}
      {reviews.length === 0 ? (
        <div className="rounded-lg bg-white p-12 text-center shadow">
          <p className="text-gray-600">No hay reviews para mostrar</p>
        </div>
      ) : (
        <div className="space-y-4">
          {reviews.map((review) => {
            const isProcessing = processing.has(review.id);

            return (
              <div
                key={review.id}
                className={`rounded-lg border bg-white p-6 ${
                  review.isApproved ? 'border-green-200' : 'border-yellow-200'
                }`}
              >
                <div className="flex gap-6">
                  {/* Info del review */}
                  <div className="flex-1">
                    <div className="mb-3 flex items-start justify-between">
                      <div>
                        <p className="font-semibold text-gray-900">{review.customerName}</p>
                        <p className="text-sm text-gray-600">{review.customerEmail}</p>
                        {review.product && (
                          <p className="mt-1 text-sm text-gray-500">
                            Producto: <span className="font-medium">{review.product.name}</span>
                          </p>
                        )}
                      </div>

                      {/* Rating */}
                      <div className="flex items-center gap-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <svg
                            key={star}
                            className={`h-5 w-5 ${
                              star <= review.rating ? 'text-yellow-400' : 'text-gray-300'
                            }`}
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                          </svg>
                        ))}
                      </div>
                    </div>

                    {/* Comentario */}
                    {review.comment && <p className="mb-3 text-gray-700">{review.comment}</p>}

                    {/* Metadata */}
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <span>{new Date(review.createdAt).toLocaleDateString('es-CO')}</span>
                      {review.isApproved ? (
                        <span className="rounded-full bg-green-100 px-2 py-0.5 text-green-800">
                          Aprobada
                        </span>
                      ) : (
                        <span className="rounded-full bg-yellow-100 px-2 py-0.5 text-yellow-800">
                          Pendiente
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Acciones */}
                  <div className="flex flex-col gap-2">
                    {!review.isApproved ? (
                      <button
                        onClick={() => handleApprove(review.id, true)}
                        disabled={isProcessing}
                        className="rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-50"
                      >
                        Aprobar
                      </button>
                    ) : (
                      <button
                        onClick={() => handleApprove(review.id, false)}
                        disabled={isProcessing}
                        className="rounded-lg bg-yellow-600 px-4 py-2 text-sm font-semibold text-white hover:bg-yellow-700 disabled:opacity-50"
                      >
                        Desaprobar
                      </button>
                    )}

                    <button
                      onClick={() => handleDelete(review.id, review.product?.name || 'producto')}
                      disabled={isProcessing}
                      className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
                    >
                      Eliminar
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
