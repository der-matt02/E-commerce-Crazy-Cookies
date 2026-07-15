import type { Review } from '@/types/review.types';

interface ReviewListProps {
  reviews: Review[];
}

export function ReviewList({ reviews }: ReviewListProps) {
  if (reviews.length === 0) {
    return (
      <div className="page-card" style={{ textAlign: 'center' }}>
        <p className="delivery-block__title">Aún no hay reviews para este producto</p>
        <p className="delivery-block__text">¡Sé el primero en dejar una opinión!</p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {reviews.map((review) => (
        <div key={review.id} className="page-card">
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'space-between',
              marginBottom: 10,
            }}
          >
            <div>
              <p className="delivery-block__title">{review.customerName}</p>
              <p className="delivery-block__text">
                {new Date(review.createdAt).toLocaleDateString('es-CO', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </p>
            </div>

            <div style={{ color: 'var(--accent)', fontSize: 16, letterSpacing: 1 }}>
              {'★'.repeat(review.rating)}
              {'☆'.repeat(5 - review.rating)}
            </div>
          </div>

          {review.comment && (
            <p className="delivery-block__text" style={{ color: 'var(--ink)' }}>
              {review.comment}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}
