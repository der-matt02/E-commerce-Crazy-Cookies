'use client';

import { useState } from 'react';
import type { CreateReviewDto } from '@/types/review.types';
import { apiErrorMessage } from '@/lib/error';

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
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.customerName || !formData.customerEmail || !formData.rating) {
      setError('Por favor completa los campos obligatorios');
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
      setSuccess(true);
    } catch (err) {
      setError(
        (err instanceof Error ? err.message : null) ||
          apiErrorMessage(err, 'Error al enviar review')
      );
    } finally {
      setSubmitting(false);
    }
  };

  const displayRating = hoveredRating ?? formData.rating;

  if (success) {
    return (
      <div className="page-card" style={{ textAlign: 'center' }}>
        <p className="delivery-block__title">¡Gracias por tu review!</p>
        <p className="delivery-block__text">Será publicada después de ser aprobada.</p>
        <button type="button" className="btn-secondary" onClick={() => setSuccess(false)}>
          Escribir otra reseña
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="page-card">
      <h3 className="order-summary__title" style={{ fontSize: 16, marginBottom: 16 }}>
        Deja tu opinión
      </h3>

      {error && <div className="form-banner-error">{error}</div>}

      <div className="form-group">
        <label className="form-label">Calificación *</label>
        <div style={{ display: 'flex', gap: 4 }}>
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              onClick={() => setFormData({ ...formData, rating: star })}
              onMouseEnter={() => setHoveredRating(star)}
              onMouseLeave={() => setHoveredRating(null)}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontSize: 28,
                lineHeight: 1,
                padding: 0,
                color: star <= displayRating ? 'var(--accent)' : 'var(--border-md)',
              }}
              aria-label={`${star} estrellas`}
            >
              ★
            </button>
          ))}
        </div>
      </div>

      <div className="form-group">
        <label className="form-label" htmlFor="review-name">
          Nombre *
        </label>
        <input
          id="review-name"
          type="text"
          className="form-input"
          value={formData.customerName}
          onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
          required
          minLength={3}
          maxLength={100}
        />
      </div>

      <div className="form-group">
        <label className="form-label" htmlFor="review-email">
          Email *
        </label>
        <input
          id="review-email"
          type="email"
          className="form-input"
          value={formData.customerEmail}
          onChange={(e) => setFormData({ ...formData, customerEmail: e.target.value })}
          required
        />
        <p className="delivery-block__text" style={{ marginTop: 4 }}>
          Tu email no será publicado
        </p>
      </div>

      <div className="form-group">
        <label className="form-label" htmlFor="review-comment">
          Comentario (opcional)
        </label>
        <textarea
          id="review-comment"
          className="form-input"
          value={formData.comment}
          onChange={(e) => setFormData({ ...formData, comment: e.target.value })}
          rows={4}
          maxLength={1000}
          placeholder="Cuéntanos sobre tu experiencia con este producto..."
        />
        <p className="delivery-block__text" style={{ marginTop: 4 }}>
          {formData.comment?.length || 0}/1000 caracteres
        </p>
      </div>

      <button type="submit" disabled={submitting} className="btn-full">
        {submitting ? 'Enviando...' : 'Enviar review'}
      </button>

      <p className="delivery-block__text" style={{ marginTop: 10 }}>
        * Tu review será revisada antes de ser publicada
      </p>
    </form>
  );
}
