import { Product } from './product.types';

export interface Cart {
  id: string;
  sessionId: string;
  expiresAt: string;
  createdAt: string;
  updatedAt: string;
  items: CartItem[];
}

export interface CartItem {
  id: string;
  cartId: string;
  productId: string;
  quantity: number;
  priceAtAdd: number;
  product: Product;
  createdAt: string;
}

export interface AddToCartDto {
  productId: string;
  quantity: number;
}

export interface UpdateCartItemDto {
  quantity: number;
}

export interface CartSummary {
  totalItems: number;
  subtotal: number;
  tax: number;
  total: number;
}
