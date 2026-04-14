'use client';

import { useState } from 'react';
import { useCart } from '@/features/cart/context/CartContext';

interface AddToCartButtonProps {
  productId: string;
  outOfStock?: boolean;
  className?: string;
}

export function AddToCartButton({
  productId,
  outOfStock = false,
  className = '',
}: AddToCartButtonProps) {
  const { addToCart } = useCart();
  const [state, setState] = useState<'idle' | 'loading' | 'added' | 'error'>('idle');

  const handleClick = async () => {
    setState('loading');
    try {
      await addToCart({ productId, quantity: 1 });
      setState('added');
      setTimeout(() => setState('idle'), 2000);
    } catch {
      setState('error');
      setTimeout(() => setState('idle'), 2500);
    }
  };

  if (outOfStock) {
    return <span className="product-card__out-label">Agotado</span>;
  }

  const label =
    state === 'loading' ? '···' :
    state === 'added'   ? '✓'   :
    state === 'error'   ? '!'   : '+';

  const modifier =
    state === 'added' ? 'btn-add btn-add--added' :
    state === 'error' ? 'btn-add btn-add--error' :
    'btn-add';

  return (
    <button
      onClick={handleClick}
      disabled={state === 'loading'}
      aria-label="Agregar al carrito"
      className={`${modifier} ${className}`}
    >
      {label}
    </button>
  );
}
