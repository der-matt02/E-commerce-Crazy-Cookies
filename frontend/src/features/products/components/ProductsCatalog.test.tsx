import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ProductsCatalog } from './ProductsCatalog';
import { CartProvider } from '@/features/cart/context/CartContext';
import { WishlistProvider } from '@/features/wishlist/context/WishlistContext';
import { productsApi } from '@/features/products/api/products-api';
import { cartApi } from '@/features/cart/api/cart-api';
import type { Product, Category } from '@/types/product.types';
import type { SearchResult } from '@/features/products/api/products-api';

vi.mock('@/features/products/api/products-api', () => ({
  productsApi: {
    search: vi.fn(),
  },
}));

vi.mock('@/features/cart/api/cart-api', () => ({
  cartApi: {
    getCart: vi.fn(),
    addToCart: vi.fn(),
    updateCartItem: vi.fn(),
    removeCartItem: vi.fn(),
    clearCart: vi.fn(),
  },
}));

const mockedProductsApi = vi.mocked(productsApi);
const mockedCartApi = vi.mocked(cartApi);

function makeProduct(overrides: Partial<Product> = {}): Product {
  return {
    id: 'product-1',
    name: 'Chocolate Cookie',
    slug: 'chocolate-cookie',
    description: 'Deliciosa galleta',
    price: 5000,
    isActive: true,
    categoryId: 'cat-1',
    inventory: {
      id: 'inv-1',
      productId: 'product-1',
      stockAvailable: 10,
      stockReserved: 0,
      stockMinimum: 2,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    images: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

function makeCategory(overrides: Partial<Category> = {}): Category {
  return {
    id: 'cat-1',
    name: 'Galletas',
    slug: 'galletas',
    description: null,
    imageUrl: null,
    isActive: true,
    order: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

const pagination: SearchResult['pagination'] = {
  total: 1,
  page: 1,
  limit: 12,
  totalPages: 1,
  hasNext: false,
  hasPrev: false,
};

function renderCatalog({
  products = [makeProduct()],
  categories = [makeCategory()],
}: { products?: Product[]; categories?: Category[] } = {}) {
  return render(
    <CartProvider>
      <WishlistProvider>
        <ProductsCatalog
          initialProducts={products}
          initialCategories={categories}
          initialPagination={{ ...pagination, total: products.length }}
        />
      </WishlistProvider>
    </CartProvider>
  );
}

describe('ProductsCatalog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedCartApi.getCart.mockResolvedValue({
      id: 'cart-1',
      sessionId: 'session-1',
      expiresAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      items: [],
    });
  });

  it('renders the initial products passed as props', async () => {
    renderCatalog();

    expect(screen.getByText('Chocolate Cookie')).toBeInTheDocument();
    expect(screen.getByText('Galletas')).toBeInTheDocument();
    // Let the CartProvider's async session-init/getCart effect settle to avoid act() warnings.
    await waitFor(() => expect(mockedCartApi.getCart).toHaveBeenCalled());
  });

  it('renders the empty state when there are no products', async () => {
    renderCatalog({ products: [] });

    expect(screen.getByText('Sin productos disponibles')).toBeInTheDocument();
    await waitFor(() => expect(mockedCartApi.getCart).toHaveBeenCalled());
  });

  it('shows an "Agotado" label and disables add-to-cart for out-of-stock products', async () => {
    renderCatalog({
      products: [
        makeProduct({
          inventory: {
            id: 'inv-1',
            productId: 'product-1',
            stockAvailable: 0,
            stockReserved: 0,
            stockMinimum: 2,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        }),
      ],
    });

    expect(screen.getAllByText('Agotado').length).toBeGreaterThan(0);
    expect(screen.queryByRole('button', { name: 'Agregar al carrito' })).not.toBeInTheDocument();
    await waitFor(() => expect(mockedCartApi.getCart).toHaveBeenCalled());
  });

  it('searches products by query text after debounce and updates the grid', async () => {
    const user = userEvent.setup();
    mockedProductsApi.search.mockResolvedValue({
      products: [makeProduct({ id: 'product-2', name: 'Vanilla Cookie' })],
      pagination: { ...pagination, total: 1 },
    });

    renderCatalog();

    await user.type(screen.getByPlaceholderText('Buscar productos...'), 'vanilla');

    await waitFor(
      () => {
        expect(mockedProductsApi.search).toHaveBeenCalledWith(
          expect.objectContaining({ q: 'vanilla', page: 1 })
        );
      },
      { timeout: 2000 }
    );

    expect(await screen.findByText('Vanilla Cookie')).toBeInTheDocument();
  });

  it('shows a "Sin resultados" message with a reset button when a search yields nothing', async () => {
    const user = userEvent.setup();
    mockedProductsApi.search.mockResolvedValue({
      products: [],
      pagination: { ...pagination, total: 0 },
    });

    renderCatalog();

    await user.type(screen.getByPlaceholderText('Buscar productos...'), 'nonexistent');

    expect(
      await screen.findByText('Sin resultados para "nonexistent"', {}, { timeout: 2000 })
    ).toBeInTheDocument();

    const resetButton = screen.getByRole('button', { name: 'Limpiar búsqueda' });
    mockedProductsApi.search.mockResolvedValue({
      products: [makeProduct()],
      pagination: { ...pagination, total: 1 },
    });
    await user.click(resetButton);

    expect(await screen.findByText('Chocolate Cookie')).toBeInTheDocument();
  });

  it('filters by category when a category chip is clicked', async () => {
    const user = userEvent.setup();
    mockedProductsApi.search.mockResolvedValue({
      products: [makeProduct()],
      pagination: { ...pagination, total: 1 },
    });

    renderCatalog();

    await user.click(screen.getByRole('button', { name: 'Galletas' }));

    await waitFor(
      () => {
        expect(mockedProductsApi.search).toHaveBeenCalledWith(
          expect.objectContaining({ categoryId: 'cat-1', page: 1 })
        );
      },
      { timeout: 2000 }
    );
    expect(screen.getByRole('button', { name: 'Galletas' })).toHaveClass('chip--active');
  });

  it('adds a product to the cart when clicking the add-to-cart button', async () => {
    const user = userEvent.setup();
    mockedCartApi.addToCart.mockResolvedValue({
      id: 'cart-1',
      sessionId: 'session-1',
      expiresAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      items: [],
    });

    renderCatalog();

    await user.click(screen.getByRole('button', { name: 'Agregar al carrito' }));

    await waitFor(() => {
      expect(mockedCartApi.addToCart).toHaveBeenCalledWith(expect.any(String), {
        productId: 'product-1',
        quantity: 1,
      });
    });
  });
});
