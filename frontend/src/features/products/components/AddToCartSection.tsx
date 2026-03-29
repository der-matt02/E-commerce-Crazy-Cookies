'use client';

import { useState } from 'react';
import { useCart } from '@/features/cart/context/CartContext';

interface AddToCartSectionProps {
  productId: string;
  stockAvailable: number;
}

export function AddToCartSection({ productId, stockAvailable }: AddToCartSectionProps) {
  const { addToCart } = useCart();
  const [quantity, setQuantity] = useState(1);
  const [adding, setAdding] = useState(false);

  const maxQuantity = Math.min(stockAvailable, 99);

  const handleAddToCart = async () => {
    setAdding(true);
    try {
      await addToCart({ productId, quantity });
      alert(
        `${quantity} ${quantity === 1 ? 'producto agregado' : 'productos agregados'} al carrito`
      );
      setQuantity(1);
    } catch (err: any) {
      alert(err.message || 'Error al agregar al carrito');
    } finally {
      setAdding(false);
    }
  };

  return (
    <div className="mb-8">
      <label className="mb-2 block text-sm font-medium text-gray-700">Cantidad</label>
      <div className="flex gap-4">
        <div className="flex items-center rounded-lg border border-gray-300">
          <button
            onClick={() => setQuantity(Math.max(1, quantity - 1))}
            disabled={quantity <= 1}
            className="px-4 py-3 hover:bg-gray-100 disabled:opacity-50"
          >
            -
          </button>
          <input
            type="number"
            value={quantity}
            onChange={(e) => {
              const val = parseInt(e.target.value);
              if (!isNaN(val)) setQuantity(Math.max(1, Math.min(maxQuantity, val)));
            }}
            min={1}
            max={maxQuantity}
            className="w-20 border-x border-gray-300 py-3 text-center"
          />
          <button
            onClick={() => setQuantity(Math.min(maxQuantity, quantity + 1))}
            disabled={quantity >= maxQuantity}
            className="px-4 py-3 hover:bg-gray-100 disabled:opacity-50"
          >
            +
          </button>
        </div>
        <button
          onClick={handleAddToCart}
          disabled={adding}
          className="flex-1 rounded-lg bg-blue-600 py-3 font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {adding ? 'Agregando...' : 'Agregar al Carrito'}
        </button>
      </div>
    </div>
  );
}
