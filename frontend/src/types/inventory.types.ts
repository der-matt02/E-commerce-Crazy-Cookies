import { Product } from './product.types';

export interface Inventory {
  id: string;
  productId: string;
  stockAvailable: number;
  stockReserved: number;
  stockMinimum: number;
  createdAt: string;
  updatedAt: string;
  product?: Product;
}

export enum InventoryMovementType {
  IN = 'IN',
  OUT = 'OUT',
  RESERVED = 'RESERVED',
  RELEASED = 'RELEASED',
  ADJUSTMENT = 'ADJUSTMENT',
}

export interface InventoryMovement {
  id: string;
  inventoryId: string;
  type: InventoryMovementType;
  quantity: number;
  reason: string | null;
  orderId: string | null;
  adminId: string | null;
  createdAt: string;
}

export enum AdjustmentType {
  IN = 'IN',
  OUT = 'OUT',
  ADJUSTMENT = 'ADJUSTMENT',
}

export enum AdjustmentDirection {
  INCREASE = 'INCREASE',
  DECREASE = 'DECREASE',
}

export interface AdjustInventoryDto {
  quantity: number;
  type: AdjustmentType;
  /** Solo aplica cuando type=ADJUSTMENT. Por defecto INCREASE. */
  direction?: AdjustmentDirection;
  reason?: string;
}

export interface StockAlert {
  productId: string;
  productName: string;
  stockAvailable: number;
  stockMinimum: number;
  deficit: number;
}

export interface ReservedAlert {
  productId: string;
  productName: string;
  stockAvailable: number;
  stockReserved: number;
  reservedPercentage: number;
}

export interface StockAlerts {
  lowStock: StockAlert[];
  highReserved: ReservedAlert[];
}
