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
    <div className="container mx-auto px-4 py-12">
      {/* Breadcrumb */}
      <nav className="mb-8 text-sm text-gray-600">
        <Link href="/products" className="hover:text-blue-600">
          Productos
        </Link>
        {product.category && (
          <>
            <span className="mx-2">/</span>
            <span>{product.category.name}</span>
          </>
        )}
        <span className="mx-2">/</span>
        <span className="text-gray-900">{product.name}</span>
      </nav>

      <div className="grid grid-cols-1 gap-12 lg:grid-cols-2">
        {/* Imagen */}
        <div>
          <div className="overflow-hidden rounded-lg bg-gradient-to-br from-blue-100 to-blue-200">
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
        </div>

        {/* Información */}
        <div>
          <div className="mb-6">
            {product.category && (
              <p className="mb-2 text-sm font-medium text-blue-600">{product.category.name}</p>
            )}
            <h1 className="mb-4 text-4xl font-bold text-gray-900">{product.name}</h1>
            <p className="text-gray-700">{product.description}</p>
          </div>

          {/* Precio */}
          <div className="mb-6 border-y border-gray-200 py-6">
            <div className="flex items-baseline gap-3">
              <p className="text-4xl font-bold text-gray-900">
                ${product.price.toLocaleString('es-CO')}
              </p>
              <p className="text-gray-600">COP</p>
            </div>
          </div>

          {/* Stock */}
          <div className="mb-6">
            {isOutOfStock ? (
              <div className="rounded-lg bg-red-50 p-4">
                <p className="font-semibold text-red-800">Producto agotado</p>
                <p className="text-sm text-red-600">
                  Este producto no está disponible en este momento
                </p>
              </div>
            ) : stockAvailable <= 5 ? (
              <div className="rounded-lg bg-orange-50 p-4">
                <p className="font-semibold text-orange-800">¡Solo {stockAvailable} disponibles!</p>
                <p className="text-sm text-orange-600">
                  Última oportunidad para obtener este producto
                </p>
              </div>
            ) : (
              <div className="rounded-lg bg-green-50 p-4">
                <p className="font-semibold text-green-800">
                  ✓ En stock ({stockAvailable} disponibles)
                </p>
              </div>
            )}
          </div>

          {/* Agregar al carrito */}
          {!isOutOfStock && (
            <AddToCartSection productId={product.id} stockAvailable={stockAvailable} />
          )}

          <Link
            href="/products"
            className="inline-block text-blue-600 hover:text-blue-800 hover:underline"
          >
            ← Volver al catálogo
          </Link>
        </div>
      </div>

      {/* Reviews */}
      <div className="mt-16">
        <h2 className="mb-8 text-3xl font-bold">Opiniones de Clientes</h2>

        {ratingStats && ratingStats.count > 0 && (
          <div className="mb-8 rounded-lg border border-gray-200 bg-white p-6">
            <div className="flex items-center gap-8">
              <div className="text-center">
                <div className="text-5xl font-bold text-gray-900">
                  {ratingStats.average.toFixed(1)}
                </div>
                <div className="mt-2 flex justify-center gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <svg
                      key={star}
                      className={`h-5 w-5 ${star <= Math.round(ratingStats.average) ? 'text-yellow-400' : 'text-gray-300'}`}
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                </div>
                <div className="mt-1 text-sm text-gray-600">
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
                      <span className="w-3 text-sm text-gray-600">{star}</span>
                      <svg
                        className="h-4 w-4 text-yellow-400"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                      <div className="h-2 flex-1 overflow-hidden rounded-full bg-gray-200">
                        <div className="h-full bg-yellow-400" style={{ width: `${percentage}%` }} />
                      </div>
                      <span className="w-8 text-sm text-gray-600">{count}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
          <div>
            <h3 className="mb-4 text-xl font-semibold">Reviews</h3>
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
