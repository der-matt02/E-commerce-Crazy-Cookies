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
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    setLoading(true);
    try {
      await addToCart({ productId, quantity: 1 });
      alert('Producto agregado al carrito');
    } catch (err: any) {
      alert(err.message || 'Error al agregar al carrito');
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={outOfStock || loading}
      className={`rounded-lg px-3 py-2 text-sm font-semibold text-white disabled:opacity-50 ${
        outOfStock ? 'cursor-not-allowed bg-gray-400' : 'bg-blue-600 hover:bg-blue-700'
      } ${className}`}
    >
      {outOfStock ? 'Agotado' : loading ? '...' : '+ Carrito'}
    </button>
  );
}
