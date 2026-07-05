'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useCart } from '@/features/cart/context/CartContext';
import { productsApi } from '@/features/products/api/products-api';
import type { Product, Category } from '@/types/product.types';
import type { SearchResult } from '@/features/products/api/products-api';
import Link from 'next/link';
import Image from 'next/image';
import { ProductCardSkeleton } from '@/components/ui/Skeleton';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
const PAGE_SIZE = 12;

interface ProductsCatalogProps {
  initialProducts: Product[];
  initialCategories: Category[];
  initialPagination: SearchResult['pagination'];
}

export function ProductsCatalog({
  initialProducts,
  initialCategories,
  initialPagination,
}: ProductsCatalogProps) {
  const { addToCart } = useCart();
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [categories] = useState<Category[]>(initialCategories);
  const [loading, setLoading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'newest' | 'price_asc' | 'price_desc' | 'name'>('newest');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(initialPagination.totalPages);
  const [totalProducts, setTotalProducts] = useState(initialPagination.total);
  const [cartState, setCartState] = useState<
    Record<string, 'idle' | 'loading' | 'added' | 'error'>
  >({});
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isFirstRender = useRef(true);

  const fetchProducts = useCallback(
    async (q: string, categoryId: string, sort: string, currentPage: number) => {
      setLoading(true);
      try {
        const result = await productsApi.search({
          q: q || undefined,
          categoryId: categoryId || undefined,
          sortBy: sort as 'newest' | 'price_asc' | 'price_desc' | 'name',
          page: currentPage,
          limit: PAGE_SIZE,
        });
        setProducts(result.products);
        setTotalPages(result.pagination.totalPages);
        setTotalProducts(result.pagination.total);
      } catch (err) {
        console.error('Error loading products:', err);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchProducts(searchQuery, selectedCategory, sortBy, page);
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [searchQuery, selectedCategory, sortBy, page, fetchProducts]);

  const handleCategoryChange = (id: string) => {
    setSelectedCategory(id);
    setPage(1);
  };
  const handleSearchChange = (q: string) => {
    setSearchQuery(q);
    setPage(1);
  };
  const handleSortChange = (s: typeof sortBy) => {
    setSortBy(s);
    setPage(1);
  };

  const handleAddToCart = async (productId: string) => {
    setCartState((prev) => ({ ...prev, [productId]: 'loading' }));
    try {
      await addToCart({ productId, quantity: 1 });
      setCartState((prev) => ({ ...prev, [productId]: 'added' }));
      setTimeout(() => setCartState((prev) => ({ ...prev, [productId]: 'idle' })), 2000);
    } catch {
      setCartState((prev) => ({ ...prev, [productId]: 'error' }));
      setTimeout(() => setCartState((prev) => ({ ...prev, [productId]: 'idle' })), 2500);
    }
  };

  return (
    <div className="catalog">
      <h1 className="catalog__title">Catálogo</h1>

      {/* Filtros */}
      <div className="catalog__filters">
        <div className="catalog__search-wrap">
          <svg
            className="catalog__search-icon"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Buscar productos..."
            className="form-input form-input--search catalog__search"
          />
        </div>
        <select
          value={sortBy}
          onChange={(e) => handleSortChange(e.target.value as typeof sortBy)}
          className="form-input"
          style={{ width: '200px' }}
        >
          <option value="newest">Más recientes</option>
          <option value="price_asc">Precio: menor a mayor</option>
          <option value="price_desc">Precio: mayor a menor</option>
          <option value="name">Nombre A-Z</option>
        </select>
      </div>

      {/* Chips de categoría */}
      {categories.length > 0 && (
        <div className="catalog__chips">
          <button
            onClick={() => handleCategoryChange('')}
            className={`chip ${selectedCategory === '' ? 'chip--active' : ''}`}
          >
            Todos
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => handleCategoryChange(cat.id)}
              className={`chip ${selectedCategory === cat.id ? 'chip--active' : ''}`}
            >
              {cat.name}
            </button>
          ))}
        </div>
      )}

      {/* Grid */}
      {loading ? (
        <div className="product-grid product-grid--4col">
          {Array.from({ length: PAGE_SIZE }).map((_, i) => (
            <ProductCardSkeleton key={i} />
          ))}
        </div>
      ) : products.length === 0 ? (
        <div className="catalog__empty">
          <p className="catalog__empty-text">
            {searchQuery ? `Sin resultados para "${searchQuery}"` : 'Sin productos disponibles'}
          </p>
          {searchQuery && (
            <button className="catalog__empty-reset" onClick={() => handleSearchChange('')}>
              Limpiar búsqueda
            </button>
          )}
        </div>
      ) : (
        <>
          <div className="product-grid product-grid--4col">
            {products.map((product) => {
              const state = cartState[product.id] ?? 'idle';
              const stockAvailable = product.inventory?.stockAvailable ?? 0;
              const isOutOfStock = stockAvailable <= 0;
              const firstImage = product.images?.[0];

              const btnLabel =
                state === 'loading'
                  ? '···'
                  : state === 'added'
                    ? '✓'
                    : state === 'error'
                      ? '!'
                      : '+';

              const btnClass =
                state === 'added'
                  ? 'btn-add btn-add--added'
                  : state === 'error'
                    ? 'btn-add btn-add--error'
                    : 'btn-add';

              return (
                <article key={product.id} className="product-card">
                  <div className="product-card__image-wrap">
                    {firstImage ? (
                      <Image
                        src={`${API_URL}${firstImage.url}`}
                        alt={firstImage.alt ?? product.name}
                        width={400}
                        height={400}
                        style={{ width: '100%', height: 'auto' }}
                        className="product-card__image"
                      />
                    ) : null}
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
                    {stockAvailable > 0 && stockAvailable <= 5 && (
                      <p className="product-card__low-stock">Solo {stockAvailable} disp.</p>
                    )}
                    <div className="product-card__footer">
                      <span className="product-card__price">
                        ${product.price.toLocaleString('es-CO')}
                      </span>
                      {isOutOfStock ? (
                        <span className="product-card__out-label">Agotado</span>
                      ) : (
                        <button
                          onClick={() => handleAddToCart(product.id)}
                          disabled={state === 'loading'}
                          aria-label="Agregar al carrito"
                          className={btnClass}
                        >
                          {btnLabel}
                        </button>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>

          {totalPages > 1 && (
            <div className="catalog__pagination">
              <p className="catalog__pagination-info">
                {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, totalProducts)} de{' '}
                {totalProducts} productos
              </p>
              <div className="catalog__pagination-controls">
                <button
                  onClick={() => setPage((p) => p - 1)}
                  disabled={page === 1}
                  className="catalog__page-btn"
                >
                  ← Anterior
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    className={`catalog__page-btn ${p === page ? 'catalog__page-btn--active' : ''}`}
                  >
                    {p}
                  </button>
                ))}
                <button
                  onClick={() => setPage((p) => p + 1)}
                  disabled={page === totalPages}
                  className="catalog__page-btn"
                >
                  Siguiente →
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
