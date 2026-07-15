import { describe, it, expect, vi, beforeEach } from 'vitest';
import { inventoryApi } from './inventory-api';
import { apiClient } from '@/lib/api-client';
import { AdjustmentType, type AdjustInventoryDto } from '@/types/inventory.types';

vi.mock('@/lib/api-client', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

const mockedApiClient = vi.mocked(apiClient, true);

describe('inventoryApi', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('getAll() fetches /inventory and returns the raw array', async () => {
    const inventories = [{ id: 'inv-1' }, { id: 'inv-2' }] as never;
    mockedApiClient.get.mockResolvedValue({ data: inventories });

    const result = await inventoryApi.getAll();

    expect(mockedApiClient.get).toHaveBeenCalledWith('/inventory');
    expect(result).toBe(inventories);
  });

  it('getOne() fetches /inventory/:productId', async () => {
    const inventory = { id: 'inv-1', productId: 'product-1' } as never;
    mockedApiClient.get.mockResolvedValue({ data: inventory });

    const result = await inventoryApi.getOne('product-1');

    expect(mockedApiClient.get).toHaveBeenCalledWith('/inventory/product-1');
    expect(result).toBe(inventory);
  });

  it('getMovements() fetches /inventory/:productId/movements', async () => {
    const movements = [{ id: 'mov-1' }] as never;
    mockedApiClient.get.mockResolvedValue({ data: movements });

    const result = await inventoryApi.getMovements('product-1');

    expect(mockedApiClient.get).toHaveBeenCalledWith('/inventory/product-1/movements');
    expect(result).toBe(movements);
  });

  it('adjustStock() posts to /inventory/:productId/adjust with the dto', async () => {
    const inventory = { id: 'inv-1', productId: 'product-1', stockAvailable: 15 } as never;
    mockedApiClient.post.mockResolvedValue({ data: inventory });
    const dto: AdjustInventoryDto = { type: AdjustmentType.IN, quantity: 5, reason: 'Restock' };

    const result = await inventoryApi.adjustStock('product-1', dto);

    expect(mockedApiClient.post).toHaveBeenCalledWith('/inventory/product-1/adjust', dto);
    expect(result).toBe(inventory);
  });

  it('getLowStock() fetches /inventory/low-stock', async () => {
    const lowStock = [{ id: 'inv-1', stockAvailable: 1 }] as never;
    mockedApiClient.get.mockResolvedValue({ data: lowStock });

    const result = await inventoryApi.getLowStock();

    expect(mockedApiClient.get).toHaveBeenCalledWith('/inventory/low-stock');
    expect(result).toBe(lowStock);
  });

  it('getAlerts() fetches /inventory/alerts', async () => {
    const alerts = { lowStock: [], outOfStock: [] } as never;
    mockedApiClient.get.mockResolvedValue({ data: alerts });

    const result = await inventoryApi.getAlerts();

    expect(mockedApiClient.get).toHaveBeenCalledWith('/inventory/alerts');
    expect(result).toBe(alerts);
  });
});
