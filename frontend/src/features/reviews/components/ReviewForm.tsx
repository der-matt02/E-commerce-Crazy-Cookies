'use client';

import { useState } from 'react';
import type { CreateReviewDto } from '@/types/review.types';

interface ReviewFormProps {
  productId: string;
  onSubmit: (dto: CreateReviewDto) => Promise<void>;
}

export function ReviewForm({ productId: _productId, onSubmit }: ReviewFormProps) {
  const [formData, setFormData] = useState<CreateReviewDto>({
    customerName: '',
    customerEmail: '',
    rating: 5,
    comment: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [hoveredRating, setHoveredRating] = useState<number | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.customerName || !formData.customerEmail || !formData.rating) {
      alert('Por favor completa los campos obligatorios');
      return;
    }

    setSubmitting(true);
    try {
      await onSubmit(formData);
      setFormData({
        customerName: '',
        customerEmail: '',
        rating: 5,
        comment: '',
      });
      alert('¡Gracias por tu review! Será publicada después de ser aprobada.');
    } catch (err: any) {
      alert(err.message || 'Error al enviar review');
    } finally {
      setSubmitting(false);
    }
  };

  const displayRating = hoveredRating ?? formData.rating;

  return (
    <form onSubmit={handleSubmit} className="rounded-lg border border-gray-200 bg-white p-6">
      <h3 className="mb-4 text-xl font-semibold">Deja tu opinión</h3>

      <div className="space-y-4">
        {/* Rating */}
        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700">Calificación *</label>
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => setFormData({ ...formData, rating: star })}
                onMouseEnter={() => setHoveredRating(star)}
                onMouseLeave={() => setHoveredRating(null)}
                className="focus:outline-none"
              >
                <svg
                  className={`h-8 w-8 transition-colors ${
                    star <= displayRating ? 'text-yellow-400' : 'text-gray-300'
                  }`}
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
              </button>
            ))}
          </div>
        </div>

        {/* Name */}
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Nombre *</label>
          <input
            type="text"
            value={formData.customerName}
            onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
            required
            minLength={3}
            maxLength={100}
            className="w-full rounded-lg border border-gray-300 px-3 py-2"
          />
        </div>

        {/* Email */}
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Email *</label>
          <input
            type="email"
            value={formData.customerEmail}
            onChange={(e) => setFormData({ ...formData, customerEmail: e.target.value })}
            required
            className="w-full rounded-lg border border-gray-300 px-3 py-2"
          />
          <p className="mt-1 text-xs text-gray-500">Tu email no será publicado</p>
        </div>

        {/* Comment */}
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Comentario (opcional)
          </label>
          <textarea
            value={formData.comment}
            onChange={(e) => setFormData({ ...formData, comment: e.target.value })}
            rows={4}
            maxLength={1000}
            placeholder="Cuéntanos sobre tu experiencia con este producto..."
            className="w-full rounded-lg border border-gray-300 px-3 py-2"
          />
          <p className="mt-1 text-xs text-gray-500">
            {formData.comment?.length || 0}/1000 caracteres
          </p>
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-lg bg-blue-600 py-3 font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {submitting ? 'Enviando...' : 'Enviar Review'}
        </button>

        <p className="text-xs text-gray-500">* Tu review será revisada antes de ser publicada</p>
      </div>
    </form>
  );
}
