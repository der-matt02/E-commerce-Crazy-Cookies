import { describe, it, expect, vi, beforeEach } from 'vitest';
import { cartApi } from './cart-api';
import { apiClient } from '@/lib/api-client';
import type { AddToCartDto, UpdateCartItemDto } from '@/types/cart.types';

vi.mock('@/lib/api-client', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

const mockedApiClient = vi.mocked(apiClient, true);
const mockCart = { id: 'cart-1', sessionId: 'session-1', items: [] } as never;

describe('cartApi', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('getCart() fetches /cart with sessionId as a query param', async () => {
    mockedApiClient.get.mockResolvedValue({ data: mockCart });

    const result = await cartApi.getCart('session-1');

    expect(mockedApiClient.get).toHaveBeenCalledWith('/cart', {
      params: { sessionId: 'session-1' },
    });
    expect(result).toBe(mockCart);
  });

  it('addToCart() posts to /cart with the dto and sessionId as a query param', async () => {
    mockedApiClient.post.mockResolvedValue({ data: mockCart });
    const dto: AddToCartDto = { productId: 'product-1', quantity: 2 };

    const result = await cartApi.addToCart('session-1', dto);

    expect(mockedApiClient.post).toHaveBeenCalledWith('/cart', dto, {
      params: { sessionId: 'session-1' },
    });
    expect(result).toBe(mockCart);
  });

  it('updateCartItem() patches /cart/items/:itemId with the dto and sessionId', async () => {
    mockedApiClient.patch.mockResolvedValue({ data: mockCart });
    const dto: UpdateCartItemDto = { quantity: 5 };

    const result = await cartApi.updateCartItem('session-1', 'item-1', dto);

    expect(mockedApiClient.patch).toHaveBeenCalledWith('/cart/items/item-1', dto, {
      params: { sessionId: 'session-1' },
    });
    expect(result).toBe(mockCart);
  });

  it('removeCartItem() deletes /cart/items/:itemId with sessionId as a query param', async () => {
    mockedApiClient.delete.mockResolvedValue({ data: mockCart });

    const result = await cartApi.removeCartItem('session-1', 'item-1');

    expect(mockedApiClient.delete).toHaveBeenCalledWith('/cart/items/item-1', {
      params: { sessionId: 'session-1' },
    });
    expect(result).toBe(mockCart);
  });

  it('clearCart() deletes /cart with sessionId as a query param', async () => {
    mockedApiClient.delete.mockResolvedValue({ data: mockCart });

    const result = await cartApi.clearCart('session-1');

    expect(mockedApiClient.delete).toHaveBeenCalledWith('/cart', {
      params: { sessionId: 'session-1' },
    });
    expect(result).toBe(mockCart);
  });
});
