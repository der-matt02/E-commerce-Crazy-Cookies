import { notFound } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { serverFetch } from '@/lib/server-api';
import { AddToCartSection } from '@/features/products/components/AddToCartSection';
import { WishlistButton } from '@/components/ui/WishlistButton';
import { formatPrice } from '@/lib/format';
import { ReviewList } from '@/features/reviews/components/ReviewList';
import { ReviewSectionClient } from '@/features/reviews/components/ReviewSectionClient';
import type { Product } from '@/types/product.types';
import type { Review, RatingStats } from '@/types/review.types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

interface Props {
  params: { id: string };
}

export default async function ProductDetailPage({ params }: Props) {
  const [product, reviews, ratingStats] = await Promise.all([
    serverFetch<Product>(`/products/${params.id}`, { revalidate: 60 }).catch(() => null),
    serverFetch<Review[]>(`/reviews/products/${params.id}`, { revalidate: 30 }).catch(() => []),
    serverFetch<RatingStats>(`/reviews/products/${params.id}/stats`, { revalidate: 30 }).catch(
      () => null
    ),
  ]);

  if (!product) notFound();

  const stockAvailable = product.inventory?.stockAvailable ?? 0;
  const isOutOfStock = stockAvailable <= 0;
  const firstImage = product.images?.[0];

  return (
    <div className="product-detail">
      {/* Breadcrumb */}
      <nav className="product-detail__breadcrumb">
        <Link href="/products" className="product-detail__breadcrumb-link">
          Productos
        </Link>
        {product.category && (
          <>
            <span className="product-detail__breadcrumb-sep">/</span>
            <span>{product.category.name}</span>
          </>
        )}
        <span className="product-detail__breadcrumb-sep">/</span>
        <span className="product-detail__breadcrumb-current">{product.name}</span>
      </nav>

      <div className="product-detail__grid">
        {/* Imagen */}
        <div className="product-detail__image-wrap">
          {firstImage ? (
            <Image
              src={`${API_URL}${firstImage.url}`}
              alt={firstImage.alt ?? product.name}
              width={600}
              height={500}
              style={{ width: '100%', height: 'auto' }}
              className="product-detail__image"
            />
          ) : (
            <div className="product-detail__image-placeholder">
              <span className="product-detail__image-placeholder-label">foto producto grande</span>
            </div>
          )}
        </div>

        {/* Info */}
        <div>
          {product.category && (
            <span className="product-detail__category">{product.category.name}</span>
          )}
          <div
            className="product-detail__title-row"
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'space-between',
              gap: '12px',
            }}
          >
            <h1 className="product-detail__name">{product.name}</h1>
            <WishlistButton productId={product.id} variant="detail" />
          </div>
          <p className="product-detail__description">{product.description}</p>

          <hr className="product-detail__divider" />

          <div className="product-detail__price-row">
            <span className="product-detail__price">{formatPrice(product.price)}</span>
            <span className="product-detail__currency">USD</span>
          </div>

          <hr className="product-detail__divider" />

          <p
            className={`product-detail__stock ${isOutOfStock ? 'product-detail__stock--out' : stockAvailable <= 5 ? 'product-detail__stock--low' : ''}`}
          >
            {isOutOfStock
              ? 'Producto no disponible en este momento'
              : stockAvailable <= 5
                ? `Solo ${stockAvailable} unidades disponibles`
                : `En stock — ${stockAvailable} disponibles`}
          </p>

          {!isOutOfStock && (
            <AddToCartSection productId={product.id} stockAvailable={stockAvailable} />
          )}

          <Link href="/products" className="product-detail__back-link">
            ← Volver al catálogo
          </Link>
        </div>
      </div>

      {/* Opiniones */}
      <div className="product-detail__reviews">
        <hr className="product-detail__reviews-divider" />
        <h2 className="product-detail__reviews-title">Opiniones de Clientes</h2>

        {ratingStats && ratingStats.count > 0 && (
          <div className="rating-summary">
            <div className="rating-summary__inner">
              <div className="rating-summary__score">
                <p className="rating-summary__number">{ratingStats.average.toFixed(1)}</p>
                <div className="rating-summary__stars">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <svg
                      key={star}
                      className={`rating-summary__star ${star <= Math.round(ratingStats.average) ? 'rating-summary__star--filled' : 'rating-summary__star--empty'}`}
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                </div>
                <p className="rating-summary__count">
                  {ratingStats.count} {ratingStats.count === 1 ? 'opinión' : 'opiniones'}
                </p>
              </div>
              <div className="rating-summary__bars">
                {[5, 4, 3, 2, 1].map((star) => {
                  const count =
                    ratingStats.distribution[star as keyof typeof ratingStats.distribution];
                  const pct = ratingStats.count > 0 ? (count / ratingStats.count) * 100 : 0;
                  return (
                    <div key={star} className="rating-summary__bar-row">
                      <span className="rating-summary__bar-label">{star}</span>
                      <div className="rating-summary__bar-track">
                        <div className="rating-summary__bar-fill" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="rating-summary__bar-count">{count}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        <div className="product-detail__reviews-grid">
          <div>
            <h3 className="product-detail__reviews-subtitle">Reseñas</h3>
            <ReviewList reviews={reviews} />
          </div>
          <div>
            <ReviewSectionClient productId={product.id} />
          </div>
        </div>
      </div>
    </div>
  );
}
