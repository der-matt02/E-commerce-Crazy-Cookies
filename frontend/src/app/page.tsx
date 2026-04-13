import { serverFetch } from '@/lib/server-api';
import type { Product } from '@/types/product.types';
import Link from 'next/link';
import { AddToCartButton } from '@/features/products/components/AddToCartButton';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export default async function HomePage() {
  const featured = await serverFetch<Product[]>('/products/featured?limit=8', {
    revalidate: 60,
  }).catch(() => [] as Product[]);

  return (
    <main className="min-h-screen">
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary-700 via-primary-600 to-orange-500 py-24 text-white">
        <div
          aria-hidden
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage:
              'radial-gradient(circle at 20% 50%, white 1px, transparent 1px), radial-gradient(circle at 80% 20%, white 1px, transparent 1px)',
            backgroundSize: '60px 60px',
          }}
        />
        <div className="container-custom relative text-center">
          <p className="mb-4 text-5xl">🍪</p>
          <h1 className="mb-4 text-5xl font-bold leading-tight tracking-tight sm:text-6xl">
            Crazy Cookies
          </h1>
          <p className="mx-auto mb-10 max-w-xl text-lg text-white/85">
            Galletas y postres artesanales hechos con amor y los mejores ingredientes.
            ¡Envío a domicilio en Bogotá!
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link
              href="/products"
              className="rounded-lg bg-white px-8 py-3 font-semibold text-primary-700 shadow-sm transition-all hover:bg-primary-50 hover:shadow-md"
            >
              Ver Catálogo
            </Link>
            <Link
              href="/cart"
              className="rounded-lg border-2 border-white/80 px-8 py-3 font-semibold text-white backdrop-blur-sm transition-all hover:border-white hover:bg-white/10"
            >
              Mi Carrito
            </Link>
          </div>
        </div>
      </section>

      {/* Features strip */}
      <section className="border-b border-gray-200 bg-white">
        <div className="container-custom py-8">
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
            {[
              { icon: '🎂', title: 'Artesanal', desc: 'Hecho a mano con ingredientes premium' },
              { icon: '🚚', title: 'Entrega rápida', desc: 'Fresco en la puerta de tu casa' },
              { icon: '💝', title: 'Hecho con amor', desc: 'Cariño en cada galleta y postre' },
            ].map(({ icon, title, desc }) => (
              <div key={title} className="flex items-start gap-4">
                <span className="text-3xl">{icon}</span>
                <div>
                  <p className="font-semibold text-gray-900">{title}</p>
                  <p className="text-sm text-gray-500">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Featured products */}
      <section className="py-16">
        <div className="container-custom">
          <div className="mb-10 text-center">
            <h2 className="mb-2 text-3xl font-bold text-gray-900 sm:text-4xl">
              Productos Destacados
            </h2>
            <p className="text-gray-500">Los favoritos de nuestros clientes</p>
          </div>

          {featured.length === 0 ? (
            <div className="rounded-xl bg-white p-16 text-center shadow-sm ring-1 ring-gray-200">
              <p className="text-gray-500">No hay productos disponibles en este momento</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {featured.map((product) => {
                const stockAvailable = product.inventory?.stockAvailable ?? 0;
                const isOutOfStock = stockAvailable <= 0;
                const firstImage = product.images?.[0];

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
                      <p className="mb-3 line-clamp-2 text-sm text-gray-500">
                        {product.description}
                      </p>
                      <div className="flex items-center justify-between">
                        <p className="text-xl font-bold text-gray-900">
                          ${product.price.toLocaleString('es-CO')}
                        </p>
                        <AddToCartButton productId={product.id} outOfStock={isOutOfStock} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="mt-12 text-center">
            <Link href="/products" className="btn-outline">
              Ver todos los productos
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
