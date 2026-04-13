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
  const [state, setState] = useState<'idle' | 'loading' | 'added' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  const maxQuantity = Math.min(stockAvailable, 99);

  const handleAddToCart = async () => {
    setState('loading');
    setErrorMsg('');
    try {
      await addToCart({ productId, quantity });
      setState('added');
      setQuantity(1);
      setTimeout(() => setState('idle'), 3000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al agregar al carrito');
      setState('error');
      setTimeout(() => setState('idle'), 3000);
    }
  };

  return (
    <div className="mb-8">
      <label className="label">Cantidad</label>
      <div className="flex gap-3">
        <div className="flex items-center overflow-hidden rounded-lg border border-gray-300 bg-white">
          <button
            onClick={() => setQuantity(Math.max(1, quantity - 1))}
            disabled={quantity <= 1}
            className="px-4 py-3 text-gray-600 transition-colors hover:bg-gray-50 disabled:opacity-40"
            aria-label="Disminuir cantidad"
          >
            −
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
            className="w-14 border-x border-gray-300 py-3 text-center font-medium focus:outline-none"
          />
          <button
            onClick={() => setQuantity(Math.min(maxQuantity, quantity + 1))}
            disabled={quantity >= maxQuantity}
            className="px-4 py-3 text-gray-600 transition-colors hover:bg-gray-50 disabled:opacity-40"
            aria-label="Aumentar cantidad"
          >
            +
          </button>
        </div>

        <button
          onClick={handleAddToCart}
          disabled={state === 'loading'}
          className={`flex-1 rounded-lg py-3 font-semibold text-white transition-colors disabled:cursor-wait ${
            state === 'added'
              ? 'bg-green-600'
              : state === 'error'
                ? 'bg-red-600'
                : 'bg-primary-600 hover:bg-primary-700'
          }`}
        >
          {state === 'loading'
            ? 'Agregando...'
            : state === 'added'
              ? `✓ ${quantity > 1 ? `${quantity} productos` : 'Producto'} agregado`
              : state === 'error'
                ? 'Error — Reintentar'
                : 'Agregar al Carrito'}
        </button>
      </div>

      {state === 'error' && errorMsg && (
        <p className="mt-2 text-sm text-red-600">{errorMsg}</p>
      )}
    </div>
  );
}
