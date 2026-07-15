import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ordersApi } from './orders-api';
import { apiClient } from '@/lib/api-client';
import { OrderStatus } from '@/types/order.types';
import type {
  CreateOrderDto,
  LookupOrderDto,
  Order,
  UpdateOrderStatusDto,
} from '@/types/order.types';

vi.mock('@/lib/api-client', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

const mockedApiClient = vi.mocked(apiClient, true);

function buildOrder(overrides: Partial<Order> = {}): Order {
  return {
    id: 'order-1',
    orderNumber: 'CC-001',
    customerName: 'Jane Doe',
    customerPhone: '5551234567',
    customerEmail: 'jane@example.com',
    shippingAddress: '123 Main St',
    shippingCity: 'Quito',
    shippingNotes: null,
    status: OrderStatus.PENDING,
    subtotal: 100,
    tax: 12,
    discount: 0,
    couponCode: null,
    total: 112,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    items: [],
    statusHistory: [],
    ...overrides,
  };
}

describe('ordersApi', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('create() posts to /orders with sessionId as a query param and returns the created order', async () => {
    const order = buildOrder();
    mockedApiClient.post.mockResolvedValue({ data: order });
    const dto: CreateOrderDto = {
      customerName: 'Jane Doe',
      customerPhone: '5551234567',
      deliveryAddress: '123 Main St',
    };

    const result = await ordersApi.create('session-123', dto);

    expect(mockedApiClient.post).toHaveBeenCalledWith('/orders', dto, {
      params: { sessionId: 'session-123' },
    });
    expect(result).toBe(order);
  });

  it('lookup() posts to /orders/lookup with the dto and returns the order', async () => {
    const order = buildOrder();
    mockedApiClient.post.mockResolvedValue({ data: order });
    const dto: LookupOrderDto = { orderNumber: 'CC-001', customerPhone: '5551234567' };

    const result = await ordersApi.lookup(dto);

    expect(mockedApiClient.post).toHaveBeenCalledWith('/orders/lookup', dto);
    expect(result).toBe(order);
  });

  it('getAll() unwraps { orders: Order[] } into Order[]', async () => {
    const orders = [buildOrder({ id: 'order-1' }), buildOrder({ id: 'order-2' })];
    mockedApiClient.get.mockResolvedValue({ data: { orders } });

    const result = await ordersApi.getAll();

    expect(mockedApiClient.get).toHaveBeenCalledWith('/orders');
    expect(result).toBe(orders);
    expect(result).toHaveLength(2);
  });

  it('getAll() returns an empty array when the API returns no orders', async () => {
    mockedApiClient.get.mockResolvedValue({ data: { orders: [] } });

    const result = await ordersApi.getAll();

    expect(result).toEqual([]);
  });

  it('getOne() fetches /orders/:id and returns the order', async () => {
    const order = buildOrder({ id: 'order-42' });
    mockedApiClient.get.mockResolvedValue({ data: order });

    const result = await ordersApi.getOne('order-42');

    expect(mockedApiClient.get).toHaveBeenCalledWith('/orders/order-42');
    expect(result).toBe(order);
  });

  it('updateStatus() patches /orders/:id/status with the dto and returns the updated order', async () => {
    const order = buildOrder({ status: OrderStatus.CONFIRMED });
    mockedApiClient.patch.mockResolvedValue({ data: order });
    const dto: UpdateOrderStatusDto = { status: OrderStatus.CONFIRMED, note: 'Confirmed by staff' };

    const result = await ordersApi.updateStatus('order-1', dto);

    expect(mockedApiClient.patch).toHaveBeenCalledWith('/orders/order-1/status', dto);
    expect(result).toBe(order);
  });

  it('getByStatus() fetches /orders/status/:status and returns the raw array', async () => {
    const orders = [buildOrder({ status: OrderStatus.READY })];
    mockedApiClient.get.mockResolvedValue({ data: orders });

    const result = await ordersApi.getByStatus('READY');

    expect(mockedApiClient.get).toHaveBeenCalledWith('/orders/status/READY');
    expect(result).toBe(orders);
  });
});
