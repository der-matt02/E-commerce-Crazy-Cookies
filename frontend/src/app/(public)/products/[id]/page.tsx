'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useCart } from '@/features/cart/context/CartContext';
import { productsApi } from '@/features/products/api/products-api';
import { reviewsApi } from '@/features/reviews/api/reviews-api';
import { ReviewList } from '@/features/reviews/components/ReviewList';
import { ReviewForm } from '@/features/reviews/components/ReviewForm';
import type { Product } from '@/types/product.types';
import type { Review, RatingStats, CreateReviewDto } from '@/types/review.types';
import Link from 'next/link';

export default function ProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { addToCart } = useCart();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [adding, setAdding] = useState(false);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [ratingStats, setRatingStats] = useState<RatingStats | null>(null);
  const [loadingReviews, setLoadingReviews] = useState(false);

  useEffect(() => {
    if (params.id) {
      loadProduct(params.id as string);
      loadReviews(params.id as string);
    }
  }, [params.id]);

  const loadProduct = async (id: string) => {
    try {
      setLoading(true);
      const data = await productsApi.getOne(id);
      setProduct(data);
    } catch (err) {
      console.error('Error loading product:', err);
      alert('Producto no encontrado');
      router.push('/products');
    } finally {
      setLoading(false);
    }
  };

  const loadReviews = async (productId: string) => {
    try {
      setLoadingReviews(true);
      const [reviewsData, statsData] = await Promise.all([
        reviewsApi.getByProduct(productId),
        reviewsApi.getProductRatingStats(productId),
      ]);
      setReviews(reviewsData);
      setRatingStats(statsData);
    } catch (err) {
      console.error('Error loading reviews:', err);
    } finally {
      setLoadingReviews(false);
    }
  };

  const handleSubmitReview = async (dto: CreateReviewDto) => {
    if (!product) return;
    await reviewsApi.createForProduct(product.id, dto);
  };

  const handleAddToCart = async () => {
    if (!product) return;

    setAdding(true);
    try {
      await addToCart({ productId: product.id, quantity });
      alert(`${quantity} ${quantity === 1 ? 'producto agregado' : 'productos agregados'} al carrito`);
      setQuantity(1);
    } catch (err: any) {
      alert(err.message || 'Error al agregar al carrito');
    } finally {
      setAdding(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-12">
        <div className="flex h-64 items-center justify-center">
          <div className="text-gray-500">Cargando producto...</div>
        </div>
      </div>
    );
  }

  if (!product) {
    return null;
  }

  const stockAvailable = product.inventory?.stockAvailable ?? 0;
  const isOutOfStock = stockAvailable <= 0;
  const maxQuantity = Math.min(stockAvailable, 99);

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
            <div className="aspect-square w-full"></div>
          </div>
        </div>

        {/* Información */}
        <div>
          <div className="mb-6">
            {product.category && (
              <p className="mb-2 text-sm font-medium text-blue-600">
                {product.category.name}
              </p>
            )}
            <h1 className="mb-4 text-4xl font-bold text-gray-900">
              {product.name}
            </h1>
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
                <p className="font-semibold text-red-800">
                  Producto agotado
                </p>
                <p className="text-sm text-red-600">
                  Este producto no está disponible en este momento
                </p>
              </div>
            ) : stockAvailable <= 5 ? (
              <div className="rounded-lg bg-orange-50 p-4">
                <p className="font-semibold text-orange-800">
                  ¡Solo {stockAvailable} disponibles!
                </p>
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

          {/* Cantidad y agregar al carrito */}
          {!isOutOfStock && (
            <div className="mb-8">
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Cantidad
              </label>
              <div className="flex gap-4">
                <div className="flex items-center rounded-lg border border-gray-300">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    disabled={quantity <= 1}
                    className="px-4 py-3 hover:bg-gray-100 disabled:opacity-50"
                  >
                    -
                  </button>
                  <input
                    type="number"
                    value={quantity}
                    onChange={(e) => {
                      const val = parseInt(e.target.value);
                      if (!isNaN(val)) {
                        setQuantity(Math.max(1, Math.min(maxQuantity, val)));
                      }
                    }}
                    min={1}
                    max={maxQuantity}
                    className="w-20 border-x border-gray-300 py-3 text-center"
                  />
                  <button
                    onClick={() => setQuantity(Math.min(maxQuantity, quantity + 1))}
                    disabled={quantity >= maxQuantity}
                    className="px-4 py-3 hover:bg-gray-100 disabled:opacity-50"
                  >
                    +
                  </button>
                </div>

                <button
                  onClick={handleAddToCart}
                  disabled={adding}
                  className="flex-1 rounded-lg bg-blue-600 py-3 font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {adding ? 'Agregando...' : 'Agregar al Carrito'}
                </button>
              </div>
            </div>
          )}

          {/* Botón volver */}
          <Link
            href="/products"
            className="inline-block text-blue-600 hover:text-blue-800 hover:underline"
          >
            ← Volver al catálogo
          </Link>
        </div>
      </div>

      {/* Sección de Reviews */}
      <div className="mt-16">
        <h2 className="mb-8 text-3xl font-bold">Opiniones de Clientes</h2>

        {/* Rating Stats */}
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
                      className={`h-5 w-5 ${
                        star <= Math.round(ratingStats.average)
                          ? 'text-yellow-400'
                          : 'text-gray-300'
                      }`}
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
                  const count = ratingStats.distribution[star as keyof typeof ratingStats.distribution];
                  const percentage = ratingStats.count > 0 ? (count / ratingStats.count) * 100 : 0;

                  return (
                    <div key={star} className="flex items-center gap-3">
                      <span className="w-3 text-sm text-gray-600">{star}</span>
                      <svg className="h-4 w-4 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                      <div className="h-2 flex-1 overflow-hidden rounded-full bg-gray-200">
                        <div
                          className="h-full bg-yellow-400"
                          style={{ width: `${percentage}%` }}
                        ></div>
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
          {/* Lista de reviews */}
          <div>
            <h3 className="mb-4 text-xl font-semibold">Reviews</h3>
            {loadingReviews ? (
              <div className="flex h-32 items-center justify-center">
                <div className="text-gray-500">Cargando reviews...</div>
              </div>
            ) : (
              <ReviewList reviews={reviews} />
            )}
          </div>

          {/* Formulario de review */}
          <div>
            <ReviewForm productId={product.id} onSubmit={handleSubmitReview} />
          </div>
        </div>
      </div>
    </div>
  );
}
