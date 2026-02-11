'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useCart } from '@/features/cart/context/CartContext';
import { productsApi } from '@/features/products/api/products-api';
import type { Product } from '@/types/product.types';
import Link from 'next/link';

export default function ProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { addToCart } = useCart();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    if (params.id) {
      loadProduct(params.id as string);
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
    </div>
  );
}
