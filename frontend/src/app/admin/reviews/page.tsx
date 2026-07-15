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
        <div className="text-ink-light">Cargando reviews...</div>
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
          className={`rounded-card px-4 py-2 ${
            filter === 'pending' ? 'bg-accent text-white' : 'bg-border text-ink hover:bg-border'
          }`}
        >
          Pendientes
          {filter !== 'pending' && reviews.filter((r) => !r.isApproved).length > 0 && (
            <span className="ml-2 rounded-full bg-error/100 px-2 py-0.5 text-xs text-white">
              {reviews.filter((r) => !r.isApproved).length}
            </span>
          )}
        </button>
        <button
          onClick={() => setFilter('approved')}
          className={`rounded-card px-4 py-2 ${
            filter === 'approved' ? 'bg-accent text-white' : 'bg-border text-ink hover:bg-border'
          }`}
        >
          Aprobadas
        </button>
        <button
          onClick={() => setFilter('all')}
          className={`rounded-card px-4 py-2 ${
            filter === 'all' ? 'bg-accent text-white' : 'bg-border text-ink hover:bg-border'
          }`}
        >
          Todas
        </button>
      </div>

      {/* Lista de reviews */}
      {reviews.length === 0 ? (
        <div className="rounded-card bg-white p-12 text-center shadow-card">
          <p className="text-ink-light">No hay reviews para mostrar</p>
        </div>
      ) : (
        <div className="space-y-4">
          {reviews.map((review) => {
            const isProcessing = processing.has(review.id);

            return (
              <div
                key={review.id}
                className={`rounded-card border bg-white p-6 ${
                  review.isApproved ? 'border-success' : 'border-accent-light'
                }`}
              >
                <div className="flex gap-6">
                  {/* Info del review */}
                  <div className="flex-1">
                    <div className="mb-3 flex items-start justify-between">
                      <div>
                        <p className="font-semibold text-ink">{review.customerName}</p>
                        <p className="text-sm text-ink-light">{review.customerEmail}</p>
                        {review.product && (
                          <p className="mt-1 text-sm text-ink-light">
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
                              star <= review.rating ? 'text-accent' : 'text-ink-lighter'
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
                    {review.comment && <p className="mb-3 text-ink">{review.comment}</p>}

                    {/* Metadata */}
                    <div className="flex items-center gap-4 text-sm text-ink-light">
                      <span>{new Date(review.createdAt).toLocaleDateString('es-CO')}</span>
                      {review.isApproved ? (
                        <span className="rounded-full bg-success/15 px-2 py-0.5 text-success-dark">
                          Aprobada
                        </span>
                      ) : (
                        <span className="rounded-full bg-accent-light px-2 py-0.5 text-accent-dark">
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
                        className="rounded-card bg-success px-4 py-2 text-sm font-semibold text-white hover:bg-success-dark disabled:opacity-50"
                      >
                        Aprobar
                      </button>
                    ) : (
                      <button
                        onClick={() => handleApprove(review.id, false)}
                        disabled={isProcessing}
                        className="rounded-card bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent-dark disabled:opacity-50"
                      >
                        Desaprobar
                      </button>
                    )}

                    <button
                      onClick={() => handleDelete(review.id, review.product?.name || 'producto')}
                      disabled={isProcessing}
                      className="rounded-card bg-error px-4 py-2 text-sm font-semibold text-white hover:bg-error-dark disabled:opacity-50"
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
