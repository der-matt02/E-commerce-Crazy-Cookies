'use client';

import { useEffect, useState } from 'react';
import { useCart } from '@/features/cart/context/CartContext';
import { productsApi, categoriesApi } from '@/features/products/api/products-api';
import type { Product, Category } from '@/types/product.types';
import Link from 'next/link';

export default function ProductsPage() {
  const { addToCart } = useCart();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [addingToCart, setAddingToCart] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [productsData, categoriesData] = await Promise.all([
        productsApi.getAll(),
        categoriesApi.getAll(),
      ]);
      setProducts(productsData.filter((p) => p.isActive));
      setCategories(categoriesData.filter((c) => c.isActive));
    } catch (err) {
      console.error('Error loading data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCategoryFilter = async (categoryId: string) => {
    setSelectedCategory(categoryId);
    try {
      setLoading(true);
      const data = categoryId
        ? await productsApi.getAll(categoryId)
        : await productsApi.getAll();
      setProducts(data.filter((p) => p.isActive));
    } catch (err) {
      console.error('Error filtering:', err);
    } finally {
      setLoading(false);
    }
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

  if (loading && products.length === 0) {
    return (
      <div className="container mx-auto px-4 py-12">
        <div className="flex h-64 items-center justify-center">
          <div className="text-gray-500">Cargando productos...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-12">
      <h1 className="mb-8 text-4xl font-bold">Catálogo de Productos</h1>

      {/* Filtros de categoría */}
      {categories.length > 0 && (
        <div className="mb-8 flex flex-wrap gap-2">
          <button
            onClick={() => handleCategoryFilter('')}
            className={`rounded-full px-4 py-2 ${
              selectedCategory === ''
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Todos
          </button>
          {categories.map((category) => (
            <button
              key={category.id}
              onClick={() => handleCategoryFilter(category.id)}
              className={`rounded-full px-4 py-2 ${
                selectedCategory === category.id
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              {category.name}
            </button>
          ))}
        </div>
      )}

      {/* Grid de productos */}
      {products.length === 0 ? (
        <div className="rounded-lg bg-white p-12 text-center shadow">
          <p className="text-gray-600">No hay productos disponibles</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {products.map((product) => {
            const isAdding = addingToCart.has(product.id);
            const stockAvailable = product.inventory?.stockAvailable ?? 0;
            const isOutOfStock = stockAvailable <= 0;

            return (
              <div
                key={product.id}
                className="overflow-hidden rounded-lg bg-white shadow transition-shadow hover:shadow-lg"
              >
                {/* Imagen placeholder */}
                <div className="h-48 w-full bg-gradient-to-br from-blue-100 to-blue-200"></div>

                {/* Contenido */}
                <div className="p-4">
                  <Link
                    href={`/products/${product.id}`}
                    className="hover:text-blue-600"
                  >
                    <h3 className="mb-2 text-lg font-semibold">{product.name}</h3>
                  </Link>

                  {product.category && (
                    <p className="mb-2 text-sm text-gray-600">
                      {product.category.name}
                    </p>
                  )}

                  <p className="mb-4 line-clamp-2 text-sm text-gray-700">
                    {product.description}
                  </p>

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
                      className={`rounded-lg px-4 py-2 font-semibold text-white transition-colors ${
                        isOutOfStock
                          ? 'cursor-not-allowed bg-gray-400'
                          : 'bg-blue-600 hover:bg-blue-700'
                      } disabled:opacity-50`}
                    >
                      {isOutOfStock
                        ? 'Agotado'
                        : isAdding
                        ? 'Agregando...'
                        : '+ Carrito'}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
