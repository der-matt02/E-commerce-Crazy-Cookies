'use client';

import { createContext, useCallback, useContext, useState, useEffect, ReactNode } from 'react';
import { cartApi } from '../api/cart-api';
import { apiErrorMessage } from '@/lib/error';
import type { Cart, AddToCartDto } from '@/types/cart.types';
import { v4 as uuidv4 } from 'uuid';

interface CartContextType {
  cart: Cart | null;
  loading: boolean;
  error: string | null;
  addToCart: (dto: AddToCartDto) => Promise<void>;
  updateQuantity: (itemId: string, quantity: number) => Promise<void>;
  removeItem: (itemId: string) => Promise<void>;
  clearCart: () => Promise<void>;
  refreshCart: () => Promise<void>;
  getTotalItems: () => number;
  getSubtotal: () => number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
  const [cart, setCart] = useState<Cart | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string>('');

  // Inicializar sessionId
  useEffect(() => {
    let sid = localStorage.getItem('cart_session_id');
    if (!sid) {
      sid = uuidv4();
      localStorage.setItem('cart_session_id', sid);
    }
    setSessionId(sid);
  }, []);

  const refreshCart = useCallback(async () => {
    if (!sessionId) return;

    try {
      setLoading(true);
      setError(null);
      const cartData = await cartApi.getCart(sessionId);
      setCart(cartData);
    } catch (err) {
      setError(apiErrorMessage(err, 'Error al cargar carrito'));
      console.error('Error loading cart:', err);
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  // Cargar carrito cuando tenemos sessionId
  useEffect(() => {
    if (sessionId) {
      refreshCart();
    }
  }, [sessionId, refreshCart]);

  const addToCart = async (dto: AddToCartDto) => {
    if (!sessionId) {
      setError('No se pudo inicializar la sesión');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const updatedCart = await cartApi.addToCart(sessionId, dto);
      setCart(updatedCart);
    } catch (err) {
      const errorMsg = apiErrorMessage(err, 'Error al agregar al carrito');
      setError(errorMsg);
      throw new Error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const updateQuantity = async (itemId: string, quantity: number) => {
    if (!sessionId) return;

    try {
      setLoading(true);
      setError(null);
      const updatedCart = await cartApi.updateCartItem(sessionId, itemId, { quantity });
      setCart(updatedCart);
    } catch (err) {
      const errorMsg = apiErrorMessage(err, 'Error al actualizar cantidad');
      setError(errorMsg);
      throw new Error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const removeItem = async (itemId: string) => {
    if (!sessionId) return;

    try {
      setLoading(true);
      setError(null);
      const updatedCart = await cartApi.removeCartItem(sessionId, itemId);
      setCart(updatedCart);
    } catch (err) {
      setError(apiErrorMessage(err, 'Error al eliminar item'));
    } finally {
      setLoading(false);
    }
  };

  const clearCart = async () => {
    if (!sessionId) return;

    try {
      setLoading(true);
      setError(null);
      const updatedCart = await cartApi.clearCart(sessionId);
      setCart(updatedCart);
    } catch (err) {
      setError(apiErrorMessage(err, 'Error al vaciar carrito'));
    } finally {
      setLoading(false);
    }
  };

  const getTotalItems = () => {
    if (!cart || !cart.items) return 0;
    return cart.items.reduce((total, item) => total + item.quantity, 0);
  };

  const getSubtotal = () => {
    if (!cart || !cart.items) return 0;
    return cart.items.reduce((total, item) => total + Number(item.price) * item.quantity, 0);
  };

  return (
    <CartContext.Provider
      value={{
        cart,
        loading,
        error,
        addToCart,
        updateQuantity,
        removeItem,
        clearCart,
        refreshCart,
        getTotalItems,
        getSubtotal,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}
