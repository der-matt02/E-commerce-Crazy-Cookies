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
    return (
      <span className="font-sans text-[11px] uppercase tracking-wider text-ink-lighter">
        Agotado
      </span>
    );
  }

  const label =
    state === 'loading' ? '···' :
    state === 'added' ? '✓' :
    state === 'error' ? '!' :
    '+';

  return (
    <button
      onClick={handleClick}
      disabled={state === 'loading'}
      aria-label="Agregar al carrito"
      className={`btn-add ${state === 'added' ? 'border-ink bg-ink text-white' : ''} ${state === 'error' ? 'border-red-500 text-red-500' : ''} ${className}`}
    >
      {label}
    </button>
  );
}
