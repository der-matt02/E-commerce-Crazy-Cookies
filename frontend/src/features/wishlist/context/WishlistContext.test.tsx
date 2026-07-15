import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { WishlistProvider, useWishlist } from './WishlistContext';

const WISHLIST_KEY = 'wishlist_ids';

function TestConsumer() {
  const { ids, isWishlisted, toggle } = useWishlist();

  return (
    <div>
      <p data-testid="ids">{ids.join(',')}</p>
      <p data-testid="is-a-wishlisted">{String(isWishlisted('product-a'))}</p>
      <button onClick={() => toggle('product-a')}>Toggle A</button>
      <button onClick={() => toggle('product-b')}>Toggle B</button>
    </div>
  );
}

function renderWithProvider() {
  return render(
    <WishlistProvider>
      <TestConsumer />
    </WishlistProvider>
  );
}

describe('WishlistContext', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('initializes with an empty list when localStorage has nothing stored', () => {
    renderWithProvider();
    expect(screen.getByTestId('ids')).toHaveTextContent('');
    expect(screen.getByTestId('is-a-wishlisted')).toHaveTextContent('false');
  });

  it('initializes from ids already present in localStorage', () => {
    localStorage.setItem(WISHLIST_KEY, JSON.stringify(['product-a', 'product-c']));

    renderWithProvider();

    expect(screen.getByTestId('ids')).toHaveTextContent('product-a,product-c');
    expect(screen.getByTestId('is-a-wishlisted')).toHaveTextContent('true');
  });

  it('falls back to an empty list when localStorage contains invalid JSON', () => {
    localStorage.setItem(WISHLIST_KEY, '{not-valid-json');

    renderWithProvider();

    expect(screen.getByTestId('ids')).toHaveTextContent('');
  });

  it('toggles a product into the wishlist and persists it to localStorage', async () => {
    const user = userEvent.setup();
    renderWithProvider();

    await user.click(screen.getByRole('button', { name: 'Toggle A' }));

    expect(screen.getByTestId('is-a-wishlisted')).toHaveTextContent('true');
    await waitFor(() => {
      expect(JSON.parse(localStorage.getItem(WISHLIST_KEY) || '[]')).toEqual(['product-a']);
    });
  });

  it('toggles a product out of the wishlist and updates localStorage', async () => {
    localStorage.setItem(WISHLIST_KEY, JSON.stringify(['product-a']));
    const user = userEvent.setup();
    renderWithProvider();

    expect(screen.getByTestId('is-a-wishlisted')).toHaveTextContent('true');

    await user.click(screen.getByRole('button', { name: 'Toggle A' }));

    expect(screen.getByTestId('is-a-wishlisted')).toHaveTextContent('false');
    await waitFor(() => {
      expect(JSON.parse(localStorage.getItem(WISHLIST_KEY) || '[]')).toEqual([]);
    });
  });

  it('does not duplicate ids when toggling the same product on repeatedly out of sync', async () => {
    const user = userEvent.setup();
    renderWithProvider();

    await user.click(screen.getByRole('button', { name: 'Toggle A' }));
    await user.click(screen.getByRole('button', { name: 'Toggle B' }));

    await waitFor(() => {
      expect(JSON.parse(localStorage.getItem(WISHLIST_KEY) || '[]')).toEqual([
        'product-a',
        'product-b',
      ]);
    });
    expect(screen.getByTestId('ids')).toHaveTextContent('product-a,product-b');
  });

  it('throws when useWishlist is used outside of a WishlistProvider', () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => render(<TestConsumer />)).toThrow(
      'useWishlist must be used within a WishlistProvider'
    );

    consoleErrorSpy.mockRestore();
  });
});
