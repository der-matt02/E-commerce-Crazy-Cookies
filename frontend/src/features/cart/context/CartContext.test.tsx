import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CartProvider, useCart } from './CartContext';
import { cartApi } from '../api/cart-api';
import type { Cart } from '@/types/cart.types';

vi.mock('../api/cart-api', () => ({
  cartApi: {
    getCart: vi.fn(),
    addToCart: vi.fn(),
    updateCartItem: vi.fn(),
    removeCartItem: vi.fn(),
    clearCart: vi.fn(),
  },
}));

const mockedCartApi = vi.mocked(cartApi);

function makeCart(overrides: Partial<Cart> = {}): Cart {
  return {
    id: 'cart-1',
    sessionId: 'session-1',
    expiresAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    items: [],
    ...overrides,
  };
}

function makeItem(overrides: Partial<Cart['items'][number]> = {}) {
  return {
    id: 'item-1',
    cartId: 'cart-1',
    productId: 'product-1',
    quantity: 1,
    price: 10,
    product: {
      id: 'product-1',
      name: 'Cookie',
      slug: 'cookie',
      description: 'desc',
      price: 10,
      isActive: true,
      categoryId: 'cat-1',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

// Test consumer that exposes cart context state/actions via the DOM
function TestConsumer() {
  const {
    cart,
    loading,
    error,
    addToCart,
    updateQuantity,
    removeItem,
    getTotalItems,
    getSubtotal,
  } = useCart();

  return (
    <div>
      <p data-testid="loading">{String(loading)}</p>
      <p data-testid="error">{error ?? ''}</p>
      <p data-testid="total-items">{getTotalItems()}</p>
      <p data-testid="subtotal">{getSubtotal()}</p>
      <ul data-testid="items">
        {cart?.items.map((item) => (
          <li key={item.id}>{item.product.name}</li>
        ))}
      </ul>
      <button
        onClick={() => {
          // addToCart intentionally rethrows so callers can react locally;
          // swallow it here since this test consumer only cares about context state.
          addToCart({ productId: 'product-1', quantity: 1 }).catch(() => {});
        }}
      >
        Add
      </button>
      <button onClick={() => updateQuantity('item-1', 5)}>Update</button>
      <button onClick={() => removeItem('item-1')}>Remove</button>
    </div>
  );
}

function renderWithProvider() {
  return render(
    <CartProvider>
      <TestConsumer />
    </CartProvider>
  );
}

describe('CartContext', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    mockedCartApi.getCart.mockResolvedValue(makeCart());
  });

  it('initializes a new session id and stores it in localStorage', async () => {
    renderWithProvider();

    await waitFor(() => {
      expect(localStorage.getItem('cart_session_id')).not.toBeNull();
    });

    const sid = localStorage.getItem('cart_session_id');
    expect(sid).toMatch(/^[0-9a-f-]{36}$/i);
    await waitFor(() => expect(mockedCartApi.getCart).toHaveBeenCalledWith(sid));
  });

  it('reuses an existing session id from localStorage instead of creating a new one', async () => {
    localStorage.setItem('cart_session_id', 'existing-session-id');

    renderWithProvider();

    await waitFor(() => expect(mockedCartApi.getCart).toHaveBeenCalledWith('existing-session-id'));
    expect(localStorage.getItem('cart_session_id')).toBe('existing-session-id');
  });

  it('adds an item to the cart', async () => {
    const user = userEvent.setup();
    mockedCartApi.addToCart.mockResolvedValue(makeCart({ items: [makeItem()] }));

    renderWithProvider();

    await waitFor(() => expect(mockedCartApi.getCart).toHaveBeenCalled());

    await user.click(screen.getByRole('button', { name: 'Add' }));

    await waitFor(() => {
      expect(screen.getByTestId('items')).toHaveTextContent('Cookie');
    });
    expect(mockedCartApi.addToCart).toHaveBeenCalledWith(expect.any(String), {
      productId: 'product-1',
      quantity: 1,
    });
    expect(screen.getByTestId('total-items')).toHaveTextContent('1');
    expect(screen.getByTestId('subtotal')).toHaveTextContent('10');
  });

  it('updates the quantity of an item', async () => {
    const user = userEvent.setup();
    mockedCartApi.updateCartItem.mockResolvedValue(
      makeCart({ items: [makeItem({ quantity: 5 })] })
    );

    renderWithProvider();
    await waitFor(() => expect(mockedCartApi.getCart).toHaveBeenCalled());

    await user.click(screen.getByRole('button', { name: 'Update' }));

    await waitFor(() => {
      expect(screen.getByTestId('total-items')).toHaveTextContent('5');
    });
    expect(mockedCartApi.updateCartItem).toHaveBeenCalledWith(expect.any(String), 'item-1', {
      quantity: 5,
    });
  });

  it('removes an item from the cart', async () => {
    const user = userEvent.setup();
    mockedCartApi.getCart.mockResolvedValue(makeCart({ items: [makeItem()] }));
    mockedCartApi.removeCartItem.mockResolvedValue(makeCart({ items: [] }));

    renderWithProvider();
    await waitFor(() => {
      expect(screen.getByTestId('items')).toHaveTextContent('Cookie');
    });

    await user.click(screen.getByRole('button', { name: 'Remove' }));

    await waitFor(() => {
      expect(screen.getByTestId('items')).not.toHaveTextContent('Cookie');
    });
    expect(mockedCartApi.removeCartItem).toHaveBeenCalledWith(expect.any(String), 'item-1');
  });

  it('surfaces an error message when addToCart fails', async () => {
    const user = userEvent.setup();
    mockedCartApi.addToCart.mockRejectedValue({
      response: { data: { message: 'Sin stock disponible' } },
    });

    renderWithProvider();
    await waitFor(() => expect(mockedCartApi.getCart).toHaveBeenCalled());

    await user.click(screen.getByRole('button', { name: 'Add' }));

    await waitFor(() => {
      expect(screen.getByTestId('error')).toHaveTextContent('Sin stock disponible');
    });
  });

  it('throws when useCart is used outside of a CartProvider', () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => render(<TestConsumer />)).toThrow('useCart must be used within a CartProvider');

    consoleErrorSpy.mockRestore();
  });
});
