import { serverFetch } from '@/lib/server-api';
import type { Product } from '@/types/product.types';
import Link from 'next/link';
import Image from 'next/image';
import { AddToCartButton } from '@/features/products/components/AddToCartButton';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export default async function HomePage() {
  const featured = await serverFetch<Product[]>('/products/featured?limit=8', {
    revalidate: 60,
  }).catch(() => [] as Product[]);

  return (
    <main>
      {/* Hero */}
      <section className="hero">
        <span className="hero__label">Repostería artesanal · Quito</span>
        <h1 className="hero__title">
          Hecho con amor,
          <br />
          pensado para ti
        </h1>
        <p className="hero__subtitle">
          Galletas y postres artesanales elaborados con los mejores ingredientes. Envío a domicilio
          en Quito.
        </p>
        <div className="hero__actions">
          <Link href="/products" className="btn-primary">
            Ver Catálogo
          </Link>
          <Link href="/cart" className="btn-secondary">
            Mi Carrito
          </Link>
        </div>
      </section>

      {/* Strip de atributos */}
      <section className="features-strip">
        <div className="features-strip__inner">
          {[
            { title: 'Artesanal', desc: 'Hecho a mano con ingredientes premium' },
            { title: 'Entrega rápida', desc: 'Fresco en la puerta de tu casa' },
            { title: 'Hecho con amor', desc: 'Cariño en cada galleta y postre' },
          ].map(({ title, desc }) => (
            <div key={title} className="features-strip__item">
              <p className="features-strip__title">{title}</p>
              <p className="features-strip__desc">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Productos destacados */}
      <section className="featured-section">
        <div className="featured-section__inner">
          <div className="featured-section__header">
            <span className="featured-section__label">Selección</span>
            <h2 className="featured-section__title">Productos Destacados</h2>
          </div>

          {featured.length === 0 ? (
            <p className="featured-section__empty">No hay productos disponibles en este momento</p>
          ) : (
            <div className="product-grid product-grid--4col">
              {featured.map((product) => {
                const stockAvailable = product.inventory?.stockAvailable ?? 0;
                const isOutOfStock = stockAvailable <= 0;
                const firstImage = product.images?.[0];

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
                      <div className="product-card__footer">
                        <span className="product-card__price">
                          ${product.price.toLocaleString('es-CO')}
                        </span>
                        <AddToCartButton productId={product.id} outOfStock={isOutOfStock} />
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}

          <div className="featured-section__cta">
            <Link href="/products" className="btn-secondary">
              Ver todos los productos
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
