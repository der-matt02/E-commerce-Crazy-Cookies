import { CartWidget } from '@/features/cart/components/CartWidget';
import Link from 'next/link';

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-50 border-b border-gray-200 bg-white/95 backdrop-blur-sm shadow-sm">
        <div className="container-custom py-4">
          <nav className="flex items-center justify-between">
            <Link
              href="/"
              className="flex items-center gap-2 text-2xl font-bold text-primary-600 transition-opacity hover:opacity-80"
            >
              <span>🍪</span>
              <span>Crazy Cookies</span>
            </Link>

            <div className="flex items-center gap-6">
              <Link
                href="/products"
                className="text-sm font-medium text-gray-600 transition-colors hover:text-primary-600"
              >
                Catálogo
              </Link>
              <CartWidget />
            </div>
          </nav>
        </div>
      </header>

      <main className="flex-1">{children}</main>

      <footer className="border-t border-gray-200 bg-gray-900 text-white">
        <div className="container-custom py-12">
          <div className="grid grid-cols-1 gap-10 md:grid-cols-3">
            <div>
              <p className="mb-3 text-xl font-bold text-primary-400">🍪 Crazy Cookies</p>
              <p className="text-sm leading-relaxed text-gray-400">
                Galletas y postres artesanales hechos con amor, usando los mejores ingredientes.
              </p>
            </div>

            <div>
              <p className="mb-4 text-sm font-semibold uppercase tracking-wider text-gray-400">
                Navegación
              </p>
              <ul className="space-y-2 text-sm text-gray-400">
                <li>
                  <Link href="/" className="transition-colors hover:text-white">
                    Inicio
                  </Link>
                </li>
                <li>
                  <Link href="/products" className="transition-colors hover:text-white">
                    Productos
                  </Link>
                </li>
                <li>
                  <Link href="/cart" className="transition-colors hover:text-white">
                    Carrito
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <p className="mb-4 text-sm font-semibold uppercase tracking-wider text-gray-400">
                Contacto
              </p>
              <ul className="space-y-2 text-sm text-gray-400">
                <li>📍 Bogotá, Colombia</li>
                <li>📞 +57 300 000 0000</li>
                <li>✉️ hola@crazycookies.co</li>
              </ul>
            </div>
          </div>

          <div className="mt-10 border-t border-gray-800 pt-6 text-center text-sm text-gray-500">
            © 2026 Crazy Cookies. Todos los derechos reservados.
          </div>
        </div>
      </footer>
    </div>
  );
}
