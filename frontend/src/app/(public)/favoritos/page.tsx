'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useWishlist } from '@/features/wishlist/context/WishlistContext';
import { useCart } from '@/features/cart/context/CartContext';
import { productsApi } from '@/features/products/api/products-api';
import { WishlistButton } from '@/components/ui/WishlistButton';
import { ProductCardSkeleton } from '@/components/ui/Skeleton';
import { formatPrice } from '@/lib/format';
import type { Product } from '@/types/product.types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export default function FavoritesPage() {
  const { ids } = useWishlist();
  const { addToCart } = useCart();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [cartState, setCartState] = useState<Record<string, 'idle' | 'loading' | 'added'>>({});

  useEffect(() => {
    if (ids.length === 0) {
      setProducts([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    Promise.allSettled(ids.map((id) => productsApi.getOne(id)))
      .then((results) => {
        const found = results
          .filter((r): r is PromiseFulfilledResult<Product> => r.status === 'fulfilled')
          .map((r) => r.value);
        setProducts(found);
      })
      .finally(() => setLoading(false));
  }, [ids]);

  const handleAddToCart = async (productId: string) => {
    setCartState((prev) => ({ ...prev, [productId]: 'loading' }));
    try {
      await addToCart({ productId, quantity: 1 });
      setCartState((prev) => ({ ...prev, [productId]: 'added' }));
      setTimeout(() => setCartState((prev) => ({ ...prev, [productId]: 'idle' })), 2000);
    } catch {
      setCartState((prev) => ({ ...prev, [productId]: 'idle' }));
    }
  };

  return (
    <div className="catalog">
      <h1 className="catalog__title">Mis favoritos</h1>

      {loading ? (
        <div className="product-grid product-grid--4col">
          {Array.from({ length: 4 }).map((_, i) => (
            <ProductCardSkeleton key={i} />
          ))}
        </div>
      ) : products.length === 0 ? (
        <div className="catalog__empty">
          <p className="catalog__empty-text">Todavía no tienes productos en favoritos</p>
          <Link href="/products" className="catalog__empty-reset">
            Ver catálogo
          </Link>
        </div>
      ) : (
        <div className="product-grid product-grid--4col">
          {products.map((product) => {
            const stockAvailable = product.inventory?.stockAvailable ?? 0;
            const isOutOfStock = stockAvailable <= 0;
            const firstImage = product.images?.[0];
            const state = cartState[product.id] ?? 'idle';

            return (
              <article key={product.id} className="product-card">
                <div
                  className={`product-card__image-wrap ${!firstImage ? 'product-card__image-wrap--placeholder' : ''}`}
                >
                  <WishlistButton productId={product.id} />
                  {firstImage ? (
                    <Image
                      src={`${API_URL}${firstImage.url}`}
                      alt={firstImage.alt ?? product.name}
                      width={400}
                      height={400}
                      style={{ width: '100%', height: 'auto' }}
                      className="product-card__image"
                    />
                  ) : (
                    <span className="product-card__image-placeholder-label">foto</span>
                  )}
                  {isOutOfStock && (
                    <div className="product-card__sold-out-overlay">
                      <span className="product-card__sold-out-label">Agotado</span>
                    </div>
                  )}
                </div>
                <div className="product-card__body">
                  {product.category && (
                    <span className="product-card__category">{product.category.name}</span>
                  )}
                  <Link href={`/products/${product.id}`} className="product-card__name">
                    {product.name}
                  </Link>
                  <div className="product-card__footer">
                    <span className="product-card__price">{formatPrice(product.price)}</span>
                    {isOutOfStock ? (
                      <span className="product-card__out-label">Agotado</span>
                    ) : (
                      <button
                        onClick={() => handleAddToCart(product.id)}
                        disabled={state === 'loading'}
                        aria-label="Agregar al carrito"
                        className={state === 'added' ? 'btn-add btn-add--added' : 'btn-add'}
                      >
                        {state === 'loading' ? '···' : state === 'added' ? '✓' : '+'}
                      </button>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
