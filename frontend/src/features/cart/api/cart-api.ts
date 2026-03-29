import { apiClient } from '@/lib/api-client';
import type { Cart, AddToCartDto, UpdateCartItemDto } from '@/types/cart.types';

export const cartApi = {
  async getCart(sessionId: string): Promise<Cart> {
    const { data } = await apiClient.get<Cart>('/cart', {
      params: { sessionId },
    });
    return data;
  },

  async addToCart(sessionId: string, dto: AddToCartDto): Promise<Cart> {
    const { data } = await apiClient.post<Cart>('/cart', dto, {
      params: { sessionId },
    });
    return data;
  },

  async updateCartItem(sessionId: string, itemId: string, dto: UpdateCartItemDto): Promise<Cart> {
    const { data } = await apiClient.patch<Cart>(`/cart/items/${itemId}`, dto, {
      params: { sessionId },
    });
    return data;
  },

  async removeCartItem(sessionId: string, itemId: string): Promise<Cart> {
    const { data } = await apiClient.delete<Cart>(`/cart/items/${itemId}`, {
      params: { sessionId },
    });
    return data;
  },

  async clearCart(sessionId: string): Promise<Cart> {
    const { data } = await apiClient.delete<Cart>('/cart', {
      params: { sessionId },
    });
    return data;
  },
};
