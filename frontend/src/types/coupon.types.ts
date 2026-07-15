export enum CouponType {
  PERCENTAGE = 'PERCENTAGE',
  FIXED = 'FIXED',
}

export interface Coupon {
  id: string;
  code: string;
  type: CouponType;
  value: number;
  minPurchase: number | null;
  maxUses: number | null;
  usedCount: number;
  isActive: boolean;
  expiresAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCouponDto {
  code: string;
  type: CouponType;
  value: number;
  minPurchase?: number;
  maxUses?: number;
  isActive?: boolean;
  expiresAt?: string;
}

export interface UpdateCouponDto extends Partial<CreateCouponDto> {}

export interface CouponValidationResult {
  coupon: Coupon;
  discount: number;
}
