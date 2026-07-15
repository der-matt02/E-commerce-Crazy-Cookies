import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { WishlistButton } from './WishlistButton';
import { WishlistProvider } from '@/features/wishlist/context/WishlistContext';

const WISHLIST_KEY = 'wishlist_ids';

function renderButton(productId = 'product-1') {
  return render(
    <WishlistProvider>
      <WishlistButton productId={productId} />
    </WishlistProvider>
  );
}

describe('WishlistButton', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('renders in the inactive state by default', () => {
    renderButton();

    const button = screen.getByRole('button', { name: 'Agregar a favoritos' });
    expect(button).toHaveAttribute('aria-pressed', 'false');
    expect(button).not.toHaveClass('product-card__wishlist--active');
  });

  it('renders in the active state when the product is already wishlisted', () => {
    localStorage.setItem(WISHLIST_KEY, JSON.stringify(['product-1']));

    renderButton();

    const button = screen.getByRole('button', { name: 'Quitar de favoritos' });
    expect(button).toHaveAttribute('aria-pressed', 'true');
    expect(button).toHaveClass('product-card__wishlist--active');
  });

  it('toggles into the wishlisted state when clicked', async () => {
    const user = userEvent.setup();
    renderButton();

    const button = screen.getByRole('button', { name: 'Agregar a favoritos' });
    await user.click(button);

    expect(screen.getByRole('button', { name: 'Quitar de favoritos' })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
  });

  it('toggles out of the wishlisted state when clicked again', async () => {
    localStorage.setItem(WISHLIST_KEY, JSON.stringify(['product-1']));
    const user = userEvent.setup();
    renderButton();

    const button = screen.getByRole('button', { name: 'Quitar de favoritos' });
    await user.click(button);

    expect(screen.getByRole('button', { name: 'Agregar a favoritos' })).toHaveAttribute(
      'aria-pressed',
      'false'
    );
  });

  it('applies the detail variant class when variant="detail"', () => {
    render(
      <WishlistProvider>
        <WishlistButton productId="product-1" variant="detail" />
      </WishlistProvider>
    );

    expect(screen.getByRole('button')).toHaveClass('btn-icon');
  });
});
