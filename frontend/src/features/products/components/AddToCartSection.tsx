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

  const btnLabel =
    state === 'loading' ? 'Agregando...' :
    state === 'added' ? `✓ ${quantity > 1 ? `${quantity} productos` : 'Producto'} agregado` :
    state === 'error' ? 'Error — Reintentar' :
    'Agregar al carrito';

  return (
    <div className="mb-8">
      <label className="form-label">Cantidad</label>
      <div className="flex gap-3">
        {/* Stepper */}
        <div className="flex items-center overflow-hidden rounded-[2px] border border-ink/20 bg-white">
          <button
            onClick={() => setQuantity(Math.max(1, quantity - 1))}
            disabled={quantity <= 1}
            className="px-4 py-3 font-sans text-[15px] text-ink-light transition-colors hover:bg-cream-dark disabled:opacity-40"
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
            className="w-14 border-x border-ink/20 py-3 text-center font-sans text-[14px] font-medium text-ink focus:outline-none"
          />
          <button
            onClick={() => setQuantity(Math.min(maxQuantity, quantity + 1))}
            disabled={quantity >= maxQuantity}
            className="px-4 py-3 font-sans text-[15px] text-ink-light transition-colors hover:bg-cream-dark disabled:opacity-40"
            aria-label="Aumentar cantidad"
          >
            +
          </button>
        </div>

        <button
          onClick={handleAddToCart}
          disabled={state === 'loading'}
          className="btn-full flex-1 disabled:cursor-wait"
        >
          {btnLabel}
        </button>
      </div>

      {state === 'error' && errorMsg && (
        <p className="mt-2 font-sans text-[12px] text-red-600">{errorMsg}</p>
      )}
    </div>
  );
}
