'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useCart } from '@/features/cart/context/CartContext';
import { productsApi } from '@/features/products/api/products-api';
import type { Product, Category } from '@/types/product.types';
import type { SearchResult } from '@/features/products/api/products-api';
import Link from 'next/link';
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

  const handleCategoryChange = (id: string) => { setSelectedCategory(id); setPage(1); };
  const handleSearchChange = (q: string) => { setSearchQuery(q); setPage(1); };
  const handleSortChange = (s: typeof sortBy) => { setSortBy(s); setPage(1); };

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
    <div className="mx-auto max-w-7xl px-6 py-16 lg:px-12">
      <h1 className="mb-10 font-serif text-[28px] font-light text-ink">Catálogo</h1>

      {/* Filtros */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <svg
            className="absolute left-3.5 top-[11px] h-4 w-4 text-ink-lighter"
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
            className="form-input pl-10"
          />
        </div>
        <select
          value={sortBy}
          onChange={(e) => handleSortChange(e.target.value as typeof sortBy)}
          className="form-input sm:w-52"
        >
          <option value="newest">Más recientes</option>
          <option value="price_asc">Precio: menor a mayor</option>
          <option value="price_desc">Precio: mayor a menor</option>
          <option value="name">Nombre A-Z</option>
        </select>
      </div>

      {/* Chips de categoría */}
      {categories.length > 0 && (
        <div className="mb-10 flex flex-wrap gap-2">
          <button
            onClick={() => handleCategoryChange('')}
            className={`chip ${selectedCategory === '' ? 'chip-active' : ''}`}
          >
            Todos
          </button>
          {categories.map((category) => (
            <button
              key={category.id}
              onClick={() => handleCategoryChange(category.id)}
              className={`chip ${selectedCategory === category.id ? 'chip-active' : ''}`}
            >
              {category.name}
            </button>
          ))}
        </div>
      )}

      {/* Grid de productos */}
      {loading ? (
        <div
          className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
          style={{
            gap: '1px',
            background: 'rgba(26,23,20,0.10)',
            border: '1px solid rgba(26,23,20,0.10)',
          }}
        >
          {Array.from({ length: PAGE_SIZE }).map((_, i) => (
            <ProductCardSkeleton key={i} />
          ))}
        </div>
      ) : products.length === 0 ? (
        <div className="border border-ink/10 py-16 text-center">
          <p className="font-serif text-[22px] font-light text-ink-light">
            {searchQuery
              ? `Sin resultados para "${searchQuery}"`
              : 'Sin productos disponibles'}
          </p>
          {searchQuery && (
            <button
              onClick={() => handleSearchChange('')}
              className="mt-4 font-sans text-[13px] text-ink underline underline-offset-2"
            >
              Limpiar búsqueda
            </button>
          )}
        </div>
      ) : (
        <>
          <div
            className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
            style={{
              gap: '1px',
              background: 'rgba(26,23,20,0.10)',
              border: '1px solid rgba(26,23,20,0.10)',
            }}
          >
            {products.map((product) => {
              const state = cartState[product.id] ?? 'idle';
              const stockAvailable = product.inventory?.stockAvailable ?? 0;
              const isOutOfStock = stockAvailable <= 0;
              const firstImage = product.images?.[0];

              const btnLabel =
                state === 'loading' ? '···' :
                state === 'added' ? '✓' :
                state === 'error' ? '!' :
                '+';

              return (
                <div key={product.id} className="group bg-cream transition-colors hover:bg-white">
                  {/* Imagen */}
                  <div
                    className="relative overflow-hidden"
                    style={{ aspectRatio: '1', background: '#F0EBE3' }}
                  >
                    {firstImage ? (
                      <img
                        src={`${API_URL}${firstImage.url}`}
                        alt={firstImage.alt ?? product.name}
                        className="h-full w-full object-cover transition-transform duration-[400ms] ease-[cubic-bezier(.25,.46,.45,.94)] group-hover:scale-[1.04]"
                      />
                    ) : (
                      <div className="h-full w-full" />
                    )}
                    {isOutOfStock && (
                      <div className="absolute inset-0 flex items-center justify-center bg-ink/30">
                        <span className="font-sans text-[11px] uppercase tracking-wider text-white">
                          Agotado
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Cuerpo */}
                  <div className="px-[18px] py-4 pb-5">
                    {product.category && (
                      <p className="microlabel mb-1">{product.category.name}</p>
                    )}
                    <Link href={`/products/${product.id}`}>
                      <h3 className="mb-2 line-clamp-1 font-serif text-[17px] text-ink transition-opacity hover:opacity-70">
                        {product.name}
                      </h3>
                    </Link>
                    {stockAvailable > 0 && stockAvailable <= 5 && (
                      <p className="mb-1 font-sans text-[11px] text-accent">
                        Solo {stockAvailable} disp.
                      </p>
                    )}
                    <div className="flex items-center justify-between">
                      <p className="font-serif text-[15px] font-medium text-ink">
                        ${product.price.toLocaleString('es-CO')}
                      </p>
                      {isOutOfStock ? (
                        <span className="font-sans text-[11px] uppercase tracking-wider text-ink-lighter">
                          Agotado
                        </span>
                      ) : (
                        <button
                          onClick={() => handleAddToCart(product.id)}
                          disabled={state === 'loading'}
                          aria-label="Agregar al carrito"
                          className={`btn-add ${state === 'added' ? 'border-ink bg-ink text-white' : ''} ${state === 'error' ? 'border-red-500 text-red-500' : ''}`}
                        >
                          {btnLabel}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {totalPages > 1 && (
            <div className="mt-12 flex flex-col items-center gap-4">
              <p className="font-sans text-[12px] text-ink-lighter">
                {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, totalProducts)} de{' '}
                {totalProducts} productos
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage((p) => p - 1)}
                  disabled={page === 1}
                  className="btn-secondary px-4 py-2 disabled:opacity-40"
                >
                  ← Anterior
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    className={p === page ? 'btn-primary px-4 py-2' : 'btn-secondary px-4 py-2'}
                  >
                    {p}
                  </button>
                ))}
                <button
                  onClick={() => setPage((p) => p + 1)}
                  disabled={page === totalPages}
                  className="btn-secondary px-4 py-2 disabled:opacity-40"
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
