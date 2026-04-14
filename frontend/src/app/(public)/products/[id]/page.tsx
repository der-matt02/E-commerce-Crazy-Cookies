import { notFound } from 'next/navigation';
import Link from 'next/link';
import { serverFetch } from '@/lib/server-api';
import { AddToCartSection } from '@/features/products/components/AddToCartSection';
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
    <div className="mx-auto max-w-7xl px-6 py-16 lg:px-12">
      {/* Breadcrumb */}
      <nav className="mb-10 flex items-center gap-2 font-sans text-[12px] text-ink-lighter">
        <Link href="/products" className="transition-colors hover:text-ink">
          Productos
        </Link>
        {product.category && (
          <>
            <span>/</span>
            <span>{product.category.name}</span>
          </>
        )}
        <span>/</span>
        <span className="text-ink">{product.name}</span>
      </nav>

      <div className="grid grid-cols-1 gap-14 lg:grid-cols-2">
        {/* Imagen */}
        <div
          className="overflow-hidden"
          style={{ background: '#F0EBE3' }}
        >
          {firstImage ? (
            <img
              src={`${API_URL}${firstImage.url}`}
              alt={firstImage.alt ?? product.name}
              className="aspect-square w-full object-cover"
            />
          ) : (
            <div className="aspect-square w-full" />
          )}
        </div>

        {/* Información */}
        <div>
          {/* Categoría + Nombre */}
          <div className="mb-6">
            {product.category && (
              <p className="microlabel mb-3">{product.category.name}</p>
            )}
            <h1 className="mb-4 font-serif text-[36px] font-light leading-tight text-ink">
              {product.name}
            </h1>
            <p className="font-sans text-[14px] leading-relaxed text-ink-light">
              {product.description}
            </p>
          </div>

          {/* Precio */}
          <div className="divider mb-6" />
          <div className="mb-6 flex items-baseline gap-2">
            <p className="font-serif text-[28px] font-[400] text-ink">
              ${product.price.toLocaleString('es-CO')}
            </p>
            <p className="font-sans text-[13px] text-ink-lighter">COP</p>
          </div>
          <div className="divider mb-6" />

          {/* Stock */}
          <div className="mb-6">
            {isOutOfStock ? (
              <p className="font-sans text-[13px] text-ink-light">
                Producto no disponible en este momento
              </p>
            ) : stockAvailable <= 5 ? (
              <p className="font-sans text-[13px] text-accent">
                Solo {stockAvailable} unidades disponibles
              </p>
            ) : (
              <p className="font-sans text-[13px] text-ink-light">
                En stock — {stockAvailable} disponibles
              </p>
            )}
          </div>

          {/* Agregar al carrito */}
          {!isOutOfStock && (
            <AddToCartSection productId={product.id} stockAvailable={stockAvailable} />
          )}

          <Link
            href="/products"
            className="font-sans text-[13px] text-ink-light underline underline-offset-2 transition-colors hover:text-ink"
          >
            ← Volver al catálogo
          </Link>
        </div>
      </div>

      {/* Opiniones */}
      <div className="mt-20">
        <div className="divider mb-10" />
        <h2 className="mb-8 font-serif text-[28px] font-light text-ink">
          Opiniones de Clientes
        </h2>

        {ratingStats && ratingStats.count > 0 && (
          <div className="mb-10 border border-ink/10 bg-white p-6">
            <div className="flex items-center gap-8">
              <div className="text-center">
                <div className="font-serif text-[48px] font-light text-ink">
                  {ratingStats.average.toFixed(1)}
                </div>
                <div className="mt-1 flex justify-center gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <svg
                      key={star}
                      className={`h-4 w-4 ${star <= Math.round(ratingStats.average) ? 'text-accent' : 'text-ink-lighter'}`}
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                </div>
                <div className="mt-1 font-sans text-[12px] text-ink-lighter">
                  {ratingStats.count} {ratingStats.count === 1 ? 'opinión' : 'opiniones'}
                </div>
              </div>
              <div className="flex-1 space-y-2">
                {[5, 4, 3, 2, 1].map((star) => {
                  const count =
                    ratingStats.distribution[star as keyof typeof ratingStats.distribution];
                  const percentage = ratingStats.count > 0 ? (count / ratingStats.count) * 100 : 0;
                  return (
                    <div key={star} className="flex items-center gap-3">
                      <span className="w-3 font-sans text-[12px] text-ink-lighter">{star}</span>
                      <div className="h-1.5 flex-1 overflow-hidden rounded-none bg-cream-dark">
                        <div
                          className="h-full bg-accent"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                      <span className="w-6 font-sans text-[12px] text-ink-lighter">{count}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 gap-10 lg:grid-cols-2">
          <div>
            <h3 className="mb-6 font-serif text-[18px] font-light text-ink">Reseñas</h3>
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
