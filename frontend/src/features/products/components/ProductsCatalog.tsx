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
  const [cartState, setCartState] = useState<Record<string, 'idle' | 'loading' | 'added' | 'error'>>({});
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
    <div className="container-custom py-12">
      <h1 className="mb-8 text-3xl font-bold text-gray-900 sm:text-4xl">Catálogo</h1>

      {/* Filtros */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <svg
            className="absolute left-3.5 top-3 h-4 w-4 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Buscar productos..."
            className="input pl-10"
          />
        </div>
        <select
          value={sortBy}
          onChange={(e) => handleSortChange(e.target.value as typeof sortBy)}
          className="input sm:w-52"
        >
          <option value="newest">Más recientes</option>
          <option value="price_asc">Precio: menor a mayor</option>
          <option value="price_desc">Precio: mayor a menor</option>
          <option value="name">Nombre A-Z</option>
        </select>
      </div>

      {/* Categorías */}
      {categories.length > 0 && (
        <div className="mb-8 flex flex-wrap gap-2">
          <button
            onClick={() => handleCategoryChange('')}
            className={`rounded-full border px-4 py-1.5 text-sm font-medium transition-colors ${
              selectedCategory === ''
                ? 'border-primary-600 bg-primary-600 text-white'
                : 'border-gray-300 bg-white text-gray-600 hover:border-primary-400 hover:text-primary-600'
            }`}
          >
            Todos
          </button>
          {categories.map((category) => (
            <button
              key={category.id}
              onClick={() => handleCategoryChange(category.id)}
              className={`rounded-full border px-4 py-1.5 text-sm font-medium transition-colors ${
                selectedCategory === category.id
                  ? 'border-primary-600 bg-primary-600 text-white'
                  : 'border-gray-300 bg-white text-gray-600 hover:border-primary-400 hover:text-primary-600'
              }`}
            >
              {category.name}
            </button>
          ))}
        </div>
      )}

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: PAGE_SIZE }).map((_, i) => (
            <ProductCardSkeleton key={i} />
          ))}
        </div>
      ) : products.length === 0 ? (
        <div className="rounded-xl bg-white py-16 text-center ring-1 ring-gray-200">
          <p className="text-4xl">🔍</p>
          <p className="mt-4 font-semibold text-gray-900">
            {searchQuery
              ? `No hay resultados para "${searchQuery}"`
              : 'No hay productos disponibles'}
          </p>
          {searchQuery && (
            <button
              onClick={() => handleSearchChange('')}
              className="mt-3 text-sm text-primary-600 hover:underline"
            >
              Limpiar búsqueda
            </button>
          )}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {products.map((product) => {
              const state = cartState[product.id] ?? 'idle';
              const stockAvailable = product.inventory?.stockAvailable ?? 0;
              const isOutOfStock = stockAvailable <= 0;
              const firstImage = product.images?.[0];

              const btnVariant =
                isOutOfStock
                  ? 'cursor-not-allowed bg-gray-100 text-gray-500'
                  : state === 'added'
                    ? 'bg-green-600 text-white'
                    : state === 'error'
                      ? 'bg-red-600 text-white'
                      : 'bg-primary-600 text-white hover:bg-primary-700';

              const btnLabel =
                isOutOfStock
                  ? 'Agotado'
                  : state === 'loading'
                    ? '...'
                    : state === 'added'
                      ? '✓ Listo'
                      : state === 'error'
                        ? 'Reintentar'
                        : '+ Carrito';

              return (
                <div key={product.id} className="card group">
                  <div className="relative h-52 overflow-hidden">
                    {firstImage ? (
                      <img
                        src={`${API_URL}${firstImage.url}`}
                        alt={firstImage.alt ?? product.name}
                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                    ) : (
                      <div className="product-placeholder h-full w-full" />
                    )}
                    {isOutOfStock && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                        <span className="rounded-full bg-white/90 px-3 py-1 text-sm font-semibold text-gray-700">
                          Agotado
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="p-4">
                    <Link href={`/products/${product.id}`}>
                      <h3 className="mb-1 font-semibold text-gray-900 transition-colors hover:text-primary-600 line-clamp-1">
                        {product.name}
                      </h3>
                    </Link>
                    {product.category && (
                      <p className="mb-1 text-xs font-medium text-primary-600">
                        {product.category.name}
                      </p>
                    )}
                    <p className="mb-4 line-clamp-2 text-sm text-gray-500">{product.description}</p>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xl font-bold text-gray-900">
                          ${product.price.toLocaleString('es-CO')}
                        </p>
                        {stockAvailable > 0 && stockAvailable <= 5 && (
                          <p className="text-xs text-orange-600">Solo {stockAvailable} disp.</p>
                        )}
                      </div>
                      <button
                        onClick={() => !isOutOfStock && handleAddToCart(product.id)}
                        disabled={isOutOfStock || state === 'loading'}
                        className={`rounded-lg px-3 py-2 text-sm font-semibold transition-colors disabled:cursor-not-allowed ${btnVariant}`}
                      >
                        {btnLabel}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {totalPages > 1 && (
            <div className="mt-12 flex flex-col items-center gap-3">
              <p className="text-sm text-gray-500">
                Mostrando {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, totalProducts)}{' '}
                de {totalProducts} productos
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage((p) => p - 1)}
                  disabled={page === 1}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-sm transition-colors hover:bg-gray-50 disabled:opacity-40"
                >
                  ← Anterior
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    className={`rounded-lg px-4 py-2 text-sm transition-colors ${
                      p === page
                        ? 'bg-primary-600 text-white'
                        : 'border border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    {p}
                  </button>
                ))}
                <button
                  onClick={() => setPage((p) => p + 1)}
                  disabled={page === totalPages}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-sm transition-colors hover:bg-gray-50 disabled:opacity-40"
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
