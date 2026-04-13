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
      <span className={`rounded-lg bg-gray-100 px-3 py-2 text-sm font-medium text-gray-500 ${className}`}>
        Agotado
      </span>
    );
  }

  const variants = {
    idle: 'bg-primary-600 hover:bg-primary-700 text-white',
    loading: 'bg-primary-400 text-white cursor-wait',
    added: 'bg-green-600 text-white',
    error: 'bg-red-600 text-white',
  };

  const labels = {
    idle: '+ Carrito',
    loading: '...',
    added: '✓ Listo',
    error: 'Reintentar',
  };

  return (
    <button
      onClick={handleClick}
      disabled={state === 'loading'}
      className={`rounded-lg px-3 py-2 text-sm font-semibold transition-colors disabled:cursor-wait ${variants[state]} ${className}`}
    >
      {labels[state]}
    </button>
  );
}
