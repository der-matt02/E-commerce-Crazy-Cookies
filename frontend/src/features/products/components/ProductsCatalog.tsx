'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useCart } from '@/features/cart/context/CartContext';
import { productsApi } from '@/features/products/api/products-api';
import type { Product, Category } from '@/types/product.types';
import type { SearchResult } from '@/features/products/api/products-api';
import Link from 'next/link';

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
  const [addingToCart, setAddingToCart] = useState<Set<string>>(new Set());
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
    setAddingToCart((prev) => new Set(prev).add(productId));
    try {
      await addToCart({ productId, quantity: 1 });
      alert('Producto agregado al carrito');
    } catch (err: any) {
      alert(err.message || 'Error al agregar al carrito');
    } finally {
      setAddingToCart((prev) => {
        const next = new Set(prev);
        next.delete(productId);
        return next;
      });
    }
  };

  return (
    <div className="container mx-auto px-4 py-12">
      <h1 className="mb-8 text-4xl font-bold">Catálogo de Productos</h1>

      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative max-w-sm flex-1">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Buscar productos..."
            className="w-full rounded-lg border border-gray-300 py-2 pl-10 pr-4 focus:border-blue-500 focus:outline-none"
          />
          <svg
            className="absolute left-3 top-2.5 h-5 w-5 text-gray-400"
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
        </div>
        <select
          value={sortBy}
          onChange={(e) => handleSortChange(e.target.value as typeof sortBy)}
          className="rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
        >
          <option value="newest">Más recientes</option>
          <option value="price_asc">Precio: menor a mayor</option>
          <option value="price_desc">Precio: mayor a menor</option>
          <option value="name">Nombre A-Z</option>
        </select>
      </div>

      {categories.length > 0 && (
        <div className="mb-8 flex flex-wrap gap-2">
          <button
            onClick={() => handleCategoryChange('')}
            className={`rounded-full px-4 py-2 ${selectedCategory === '' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
          >
            Todos
          </button>
          {categories.map((category) => (
            <button
              key={category.id}
              onClick={() => handleCategoryChange(category.id)}
              className={`rounded-full px-4 py-2 ${selectedCategory === category.id ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
            >
              {category.name}
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="text-gray-500">Cargando productos...</div>
        </div>
      ) : products.length === 0 ? (
        <div className="rounded-lg bg-white p-12 text-center shadow">
          <p className="text-gray-600">
            {searchQuery
              ? `No se encontraron productos para &quot;${searchQuery}&quot;`
              : 'No hay productos disponibles'}
          </p>
          {searchQuery && (
            <button
              onClick={() => handleSearchChange('')}
              className="mt-4 text-blue-600 hover:underline"
            >
              Limpiar búsqueda
            </button>
          )}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {products.map((product) => {
              const isAdding = addingToCart.has(product.id);
              const stockAvailable = product.inventory?.stockAvailable ?? 0;
              const isOutOfStock = stockAvailable <= 0;
              const firstImage = product.images?.[0];

              return (
                <div
                  key={product.id}
                  className="overflow-hidden rounded-lg bg-white shadow transition-shadow hover:shadow-lg"
                >
                  {firstImage ? (
                    <img
                      src={`${API_URL}${firstImage.url}`}
                      alt={firstImage.alt ?? product.name}
                      className="h-48 w-full object-cover"
                    />
                  ) : (
                    <div className="h-48 w-full bg-gradient-to-br from-blue-100 to-blue-200" />
                  )}
                  <div className="p-4">
                    <Link href={`/products/${product.id}`} className="hover:text-blue-600">
                      <h3 className="mb-2 text-lg font-semibold">{product.name}</h3>
                    </Link>
                    {product.category && (
                      <p className="mb-2 text-sm text-gray-600">{product.category.name}</p>
                    )}
                    <p className="mb-4 line-clamp-2 text-sm text-gray-700">{product.description}</p>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-2xl font-bold text-gray-900">
                          ${product.price.toLocaleString('es-CO')}
                        </p>
                        {stockAvailable > 0 && stockAvailable <= 5 && (
                          <p className="text-xs text-orange-600">
                            Solo {stockAvailable} disponibles
                          </p>
                        )}
                      </div>
                      <button
                        onClick={() => handleAddToCart(product.id)}
                        disabled={isAdding || isOutOfStock}
                        className={`rounded-lg px-4 py-2 font-semibold text-white transition-colors disabled:opacity-50 ${isOutOfStock ? 'cursor-not-allowed bg-gray-400' : 'bg-blue-600 hover:bg-blue-700'}`}
                      >
                        {isOutOfStock ? 'Agotado' : isAdding ? 'Agregando...' : '+ Carrito'}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {totalPages > 1 && (
            <div className="mt-10 flex flex-col items-center gap-3">
              <p className="text-sm text-gray-500">
                Mostrando {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, totalProducts)}{' '}
                de {totalProducts} productos
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage((p) => p - 1)}
                  disabled={page === 1}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-sm hover:bg-gray-50 disabled:opacity-40"
                >
                  ← Anterior
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    className={`rounded-lg px-4 py-2 text-sm ${p === page ? 'bg-blue-600 text-white' : 'border border-gray-300 hover:bg-gray-50'}`}
                  >
                    {p}
                  </button>
                ))}
                <button
                  onClick={() => setPage((p) => p + 1)}
                  disabled={page === totalPages}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-sm hover:bg-gray-50 disabled:opacity-40"
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
