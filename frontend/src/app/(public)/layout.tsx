import { CartWidget } from '@/features/cart/components/CartWidget';
import Link from 'next/link';

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      {/* Nav — cream/0.92 backdrop */}
      <header
        className="sticky top-0 z-50 border-b border-ink/10"
        style={{ background: 'rgba(249,246,241,0.92)', backdropFilter: 'blur(12px)' }}
      >
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6 lg:px-12">
          <Link
            href="/"
            className="font-serif text-[22px] tracking-wide2 text-ink transition-opacity hover:opacity-70"
          >
            Crazy Cookies
          </Link>

          <nav className="flex items-center gap-8">
            <Link
              href="/products"
              className="font-sans text-[13px] tracking-[0.04em] text-ink-light transition-colors hover:text-ink"
            >
              Catálogo
            </Link>
            <CartWidget />
          </nav>
        </div>
      </header>

      <main className="flex-1">{children}</main>

      <footer className="border-t border-ink/10 bg-ink">
        <div className="mx-auto max-w-7xl px-6 py-14 lg:px-12">
          <div className="grid grid-cols-1 gap-10 md:grid-cols-3">
            <div>
              <p className="mb-3 font-serif text-[18px] font-light tracking-wide2 text-white/80">
                Crazy Cookies
              </p>
              <p className="font-sans text-[13px] leading-relaxed text-white/40">
                Galletas y postres artesanales hechos con amor,
                usando los mejores ingredientes.
              </p>
            </div>

            <div>
              <p className="mb-4 font-sans text-[10px] uppercase tracking-[0.12em] text-white/30">
                Navegación
              </p>
              <ul className="space-y-2 font-sans text-[13px] text-white/50">
                <li>
                  <Link href="/" className="transition-colors hover:text-white">Inicio</Link>
                </li>
                <li>
                  <Link href="/products" className="transition-colors hover:text-white">Productos</Link>
                </li>
                <li>
                  <Link href="/cart" className="transition-colors hover:text-white">Carrito</Link>
                </li>
              </ul>
            </div>

            <div>
              <p className="mb-4 font-sans text-[10px] uppercase tracking-[0.12em] text-white/30">
                Contacto
              </p>
              <ul className="space-y-2 font-sans text-[13px] text-white/50">
                <li>Quito, Ecuador</li>
                <li>+57 300 000 0000</li>
                <li>hola@crazycookies.co</li>
              </ul>
            </div>
          </div>

          <div className="mt-12 border-t border-white/10 pt-6 text-center font-sans text-[11px] text-white/25">
            © 2026 Crazy Cookies. Todos los derechos reservados.
          </div>
        </div>
      </footer>
    </div>
  );
}
