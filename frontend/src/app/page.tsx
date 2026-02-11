'use client';

import { useEffect, useState } from 'react';
import { useCart } from '@/features/cart/context/CartContext';
import { productsApi } from '@/features/products/api/products-api';
import type { Product } from '@/types/product.types';
import Link from 'next/link';

export default function HomePage() {
  const { addToCart } = useCart();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [addingToCart, setAddingToCart] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadFeaturedProducts();
  }, []);

  const loadFeaturedProducts = async () => {
    try {
      setLoading(true);
      const data = await productsApi.getAll();
      setProducts(data.filter((p) => p.isActive).slice(0, 8));
    } catch (err) {
      console.error('Error loading products:', err);
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

  return (
    <main className="min-h-screen">
      {/* Hero Section */}
      <section className="bg-gradient-to-r from-blue-600 to-blue-800 py-20 text-white">
        <div className="container mx-auto px-4 text-center">
          <h1 className="mb-4 text-6xl font-bold">
            🍪 Crazy Cookies
          </h1>
          <p className="mb-8 text-2xl">
            Las mejores galletas y postres artesanales, hechos con amor
          </p>
          <div className="space-x-4">
            <Link
              href="/products"
              className="inline-block rounded-lg bg-white px-8 py-3 font-semibold text-blue-600 hover:bg-gray-100"
            >
              Ver Catálogo
            </Link>
            <Link
              href="/cart"
              className="inline-block rounded-lg border-2 border-white px-8 py-3 font-semibold hover:bg-white hover:text-blue-600"
            >
              Ir al Carrito
            </Link>
          </div>
        </div>
      </section>

      {/* Productos Destacados */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="mb-12 text-center">
            <h2 className="mb-4 text-4xl font-bold text-gray-900">
              Productos Destacados
            </h2>
            <p className="text-gray-600">
              Descubre nuestros productos más populares
            </p>
          </div>

          {loading ? (
            <div className="flex h-64 items-center justify-center">
              <div className="text-gray-500">Cargando productos...</div>
            </div>
          ) : products.length === 0 ? (
            <div className="rounded-lg bg-white p-12 text-center shadow">
              <p className="text-gray-600">No hay productos disponibles</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {products.map((product) => {
                const isAdding = addingToCart.has(product.id);
                const stockAvailable = product.inventory?.stockAvailable ?? 0;
                const isOutOfStock = stockAvailable <= 0;

                return (
                  <div
                    key={product.id}
                    className="overflow-hidden rounded-lg bg-white shadow transition-shadow hover:shadow-lg"
                  >
                    <div className="h-48 w-full bg-gradient-to-br from-blue-100 to-blue-200"></div>

                    <div className="p-4">
                      <Link
                        href={`/products/${product.id}`}
                        className="hover:text-blue-600"
                      >
                        <h3 className="mb-2 text-lg font-semibold">
                          {product.name}
                        </h3>
                      </Link>

                      <p className="mb-4 line-clamp-2 text-sm text-gray-700">
                        {product.description}
                      </p>

                      <div className="flex items-center justify-between">
                        <p className="text-xl font-bold text-gray-900">
                          ${product.price.toLocaleString('es-CO')}
                        </p>

                        <button
                          onClick={() => handleAddToCart(product.id)}
                          disabled={isAdding || isOutOfStock}
                          className={`rounded-lg px-3 py-2 text-sm font-semibold text-white ${
                            isOutOfStock
                              ? 'cursor-not-allowed bg-gray-400'
                              : 'bg-blue-600 hover:bg-blue-700'
                          } disabled:opacity-50`}
                        >
                          {isOutOfStock ? 'Agotado' : isAdding ? '...' : '+ Carrito'}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="mt-12 text-center">
            <Link
              href="/products"
              className="inline-block rounded-lg border-2 border-blue-600 px-8 py-3 font-semibold text-blue-600 hover:bg-blue-600 hover:text-white"
            >
              Ver Todos los Productos
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="bg-gray-50 py-16">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
            <div className="text-center">
              <div className="mb-4 text-4xl">🎂</div>
              <h3 className="mb-2 text-xl font-semibold">Productos Artesanales</h3>
              <p className="text-gray-600">
                Cada producto es hecho a mano con ingredientes de la mejor calidad
              </p>
            </div>
            <div className="text-center">
              <div className="mb-4 text-4xl">🚚</div>
              <h3 className="mb-2 text-xl font-semibold">Entrega Rápida</h3>
              <p className="text-gray-600">
                Recibe tus productos frescos en la puerta de tu casa
              </p>
            </div>
            <div className="text-center">
              <div className="mb-4 text-4xl">💝</div>
              <h3 className="mb-2 text-xl font-semibold">Hecho con Amor</h3>
              <p className="text-gray-600">
                Ponemos todo nuestro cariño en cada galleta y postre
              </p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
