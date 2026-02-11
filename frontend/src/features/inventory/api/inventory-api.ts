import { apiClient } from '@/lib/api-client';
import type {
  Inventory,
  InventoryMovement,
  AdjustInventoryDto,
  StockAlerts,
} from '@/types/inventory.types';

export const inventoryApi = {
  async getAll(): Promise<Inventory[]> {
    const { data } = await apiClient.get<Inventory[]>('/inventory');
    return data;
  },

  async getOne(productId: string): Promise<Inventory> {
    const { data } = await apiClient.get<Inventory>(`/inventory/${productId}`);
    return data;
  },

  async getMovements(productId: string): Promise<InventoryMovement[]> {
    const { data } = await apiClient.get<InventoryMovement[]>(
      `/inventory/${productId}/movements`
    );
    return data;
  },

  async adjustStock(productId: string, dto: AdjustInventoryDto): Promise<Inventory> {
    const { data } = await apiClient.post<Inventory>(
      `/inventory/${productId}/adjust`,
      dto
    );
    return data;
  },

  async getLowStock(): Promise<Inventory[]> {
    const { data } = await apiClient.get<Inventory[]>('/inventory/low-stock');
    return data;
  },

  async getAlerts(): Promise<StockAlerts> {
    const { data } = await apiClient.get<StockAlerts>('/inventory/alerts');
    return data;
  },
};
