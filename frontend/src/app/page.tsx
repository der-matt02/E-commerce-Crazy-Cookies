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
      {/* Hero — cream-dark, sin gradiente */}
      <section className="bg-cream-dark px-6 py-28 text-center lg:px-12">
        <p className="microlabel mb-6">Repostería artesanal · Quito</p>
        <h1
          className="mx-auto mb-6 font-serif font-light text-ink"
          style={{ fontSize: 'clamp(38px, 4vw, 58px)', lineHeight: 1.15, maxWidth: '640px' }}
        >
          Hecho con amor,
          <br />
          pensado para ti
        </h1>
        <p className="mx-auto mb-10 max-w-md font-sans text-[14px] leading-relaxed text-ink-light">
          Galletas y postres artesanales elaborados con los mejores ingredientes.
          Envío a domicilio en Quito.
        </p>
        <div className="flex flex-wrap justify-center gap-4">
          <Link href="/products" className="btn-primary">
            Ver Catálogo
          </Link>
          <Link href="/cart" className="btn-secondary">
            Mi Carrito
          </Link>
        </div>
      </section>

      {/* Strip de atributos */}
      <section className="border-y border-ink/10 bg-white">
        <div className="mx-auto max-w-7xl px-6 py-8 lg:px-12">
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-3 sm:divide-x sm:divide-ink/10">
            {[
              { title: 'Artesanal', desc: 'Hecho a mano con ingredientes premium' },
              { title: 'Entrega rápida', desc: 'Fresco en la puerta de tu casa' },
              { title: 'Hecho con amor', desc: 'Cariño en cada galleta y postre' },
            ].map(({ title, desc }) => (
              <div key={title} className="text-center sm:px-6">
                <p className="font-sans text-[13px] font-medium text-ink">{title}</p>
                <p className="mt-1 font-sans text-[13px] text-ink-light">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Productos destacados */}
      <section className="py-20">
        <div className="mx-auto max-w-7xl px-6 lg:px-12">
          <div className="mb-12 text-center">
            <p className="microlabel mb-3">Selección</p>
            <h2 className="font-serif text-[28px] font-light text-ink">
              Productos Destacados
            </h2>
          </div>

          {featured.length === 0 ? (
            <p className="py-16 text-center font-sans text-[14px] text-ink-lighter">
              No hay productos disponibles en este momento
            </p>
          ) : (
            /* Grid 1px-border trick */
            <div
              className="grid grid-cols-2 lg:grid-cols-4"
              style={{
                gap: '1px',
                background: 'rgba(26,23,20,0.10)',
                border: '1px solid rgba(26,23,20,0.10)',
              }}
            >
              {featured.map((product) => {
                const stockAvailable = product.inventory?.stockAvailable ?? 0;
                const isOutOfStock = stockAvailable <= 0;
                const firstImage = product.images?.[0];

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
                      <div className="flex items-center justify-between">
                        <p className="font-serif text-[15px] font-medium text-ink">
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
            <Link href="/products" className="btn-secondary">
              Ver todos los productos
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
