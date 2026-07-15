'use client';

import { useWishlist } from '@/features/wishlist/context/WishlistContext';

interface WishlistButtonProps {
  productId: string;
  variant?: 'card' | 'detail';
}

export function WishlistButton({ productId, variant = 'card' }: WishlistButtonProps) {
  const { isWishlisted, toggle } = useWishlist();
  const active = isWishlisted(productId);

  const className =
    variant === 'card'
      ? `product-card__wishlist ${active ? 'product-card__wishlist--active' : ''}`
      : `btn-icon ${active ? 'product-card__wishlist--active' : ''}`;

  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        toggle(productId);
      }}
      aria-label={active ? 'Quitar de favoritos' : 'Agregar a favoritos'}
      aria-pressed={active}
      className={className}
    >
      <svg
        width={16}
        height={16}
        fill={active ? 'currentColor' : 'none'}
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M4.318 6.318a4.5 4.5 0 016.364 0L12 7.636l1.318-1.318a4.5 4.5 0 116.364 6.364L12 20.364l-7.682-7.682a4.5 4.5 0 010-6.364z"
        />
      </svg>
    </button>
  );
}
