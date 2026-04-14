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
    state === 'added'   ? `✓ ${quantity > 1 ? `${quantity} productos` : 'Producto'} agregado` :
    state === 'error'   ? 'Error — Reintentar' :
    'Agregar al carrito';

  return (
    <div className="add-to-cart">
      <label className="form-label">Cantidad</label>
      <div className="add-to-cart__row">
        <div className="add-to-cart__stepper">
          <button
            className="add-to-cart__step-btn"
            onClick={() => setQuantity(Math.max(1, quantity - 1))}
            disabled={quantity <= 1}
            aria-label="Disminuir"
          >−</button>
          <input
            type="number"
            value={quantity}
            onChange={(e) => {
              const val = parseInt(e.target.value);
              if (!isNaN(val)) setQuantity(Math.max(1, Math.min(maxQuantity, val)));
            }}
            min={1}
            max={maxQuantity}
            className="add-to-cart__input"
          />
          <button
            className="add-to-cart__step-btn"
            onClick={() => setQuantity(Math.min(maxQuantity, quantity + 1))}
            disabled={quantity >= maxQuantity}
            aria-label="Aumentar"
          >+</button>
        </div>
        <button
          onClick={handleAddToCart}
          disabled={state === 'loading'}
          className="btn-full"
          style={{ flex: 1 }}
        >
          {btnLabel}
        </button>
      </div>
      {state === 'error' && errorMsg && (
        <p className="add-to-cart__error">{errorMsg}</p>
      )}
    </div>
  );
}
