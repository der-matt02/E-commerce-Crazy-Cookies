import { CartWidget } from '@/features/cart/components/CartWidget';
import Link from 'next/link';

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', minHeight: '100vh', flexDirection: 'column' }}>

      <header className="nav">
        <div className="nav__inner">
          <Link href="/" className="nav__logo">Crazy Cookies</Link>
          <nav className="nav__links">
            <Link href="/products" className="nav__link">Catálogo</Link>
            <CartWidget />
          </nav>
        </div>
      </header>

      <main style={{ flex: 1 }}>{children}</main>

      <footer className="footer">
        <div className="footer__grid">
          <div>
            <p className="footer__brand-name">Crazy Cookies</p>
            <p className="footer__brand-desc">
              Galletas y postres artesanales<br />
              hechos con amor, usando los<br />
              mejores ingredientes.
            </p>
          </div>

          <div>
            <p className="footer__section-title">Navegación</p>
            <ul className="footer__list">
              {[
                { href: '/', label: 'Inicio' },
                { href: '/products', label: 'Productos' },
                { href: '/cart', label: 'Carrito' },
              ].map(({ href, label }) => (
                <li key={href} className="footer__list-item">
                  <Link href={href} className="footer__link">{label}</Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="footer__section-title">Contacto</p>
            <ul className="footer__list">
              {['Quito, Ecuador', '+593 99 000 0000', 'hola@crazycookies.ec'].map((item) => (
                <li key={item} className="footer__list-item">{item}</li>
              ))}
            </ul>
          </div>
        </div>

        <div className="footer__bottom">
          © 2026 Crazy Cookies. Todos los derechos reservados.
        </div>
      </footer>

    </div>
  );
}
