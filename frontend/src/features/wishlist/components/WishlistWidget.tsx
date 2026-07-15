'use client';

import Link from 'next/link';
import { useWishlist } from '../context/WishlistContext';

export function WishlistWidget() {
  const { ids } = useWishlist();

  return (
    <Link href="/favoritos" className="cart-widget" aria-label="Favoritos">
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M4.318 6.318a4.5 4.5 0 016.364 0L12 7.636l1.318-1.318a4.5 4.5 0 116.364 6.364L12 20.364l-7.682-7.682a4.5 4.5 0 010-6.364z" />
      </svg>
      {ids.length > 0 && (
        <span className="cart-widget__badge">{ids.length > 99 ? '99+' : ids.length}</span>
      )}
    </Link>
  );
}
