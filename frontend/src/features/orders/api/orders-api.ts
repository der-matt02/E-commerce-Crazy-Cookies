import { apiClient } from '@/lib/api-client';
import type {
  Order,
  CreateOrderDto,
  UpdateOrderStatusDto,
  LookupOrderDto,
} from '@/types/order.types';

export const ordersApi = {
  async create(sessionId: string, dto: CreateOrderDto): Promise<Order> {
    const { data } = await apiClient.post<Order>('/orders', dto, {
      params: { sessionId },
    });
    return data;
  },

  async lookup(dto: LookupOrderDto): Promise<Order> {
    const { data } = await apiClient.post<Order>('/orders/lookup', dto);
    return data;
  },

  async getAll(): Promise<Order[]> {
    const { data } = await apiClient.get<{ orders: Order[] }>('/orders');
    return data.orders;
  },

  async getOne(id: string): Promise<Order> {
    const { data } = await apiClient.get<Order>(`/orders/${id}`);
    return data;
  },

  async updateStatus(id: string, dto: UpdateOrderStatusDto): Promise<Order> {
    const { data } = await apiClient.patch<Order>(`/orders/${id}/status`, dto);
    return data;
  },

  async getByStatus(status: string): Promise<Order[]> {
    const { data } = await apiClient.get<Order[]>(`/orders/status/${status}`);
    return data;
  },
};
