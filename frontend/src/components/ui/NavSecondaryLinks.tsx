'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const LINKS = [
  { href: '/products', label: 'Catálogo' },
  { href: '/favoritos', label: 'Favoritos' },
  { href: '/pedidos/buscar', label: 'Buscar pedido' },
];

export function NavSecondaryLinks() {
  const pathname = usePathname();

  return (
    <nav className="nav__secondary">
      {LINKS.map(({ href, label }) => (
        <Link
          key={href}
          href={href}
          className={`nav__link ${pathname === href ? 'nav__link--active' : ''}`}
        >
          {label}
        </Link>
      ))}
    </nav>
  );
}
