import { apiClient } from '@/lib/api-client';
import type {
  Coupon,
  CreateCouponDto,
  UpdateCouponDto,
  CouponValidationResult,
} from '@/types/coupon.types';

export const couponsApi = {
  async getAll(): Promise<Coupon[]> {
    const { data } = await apiClient.get<Coupon[]>('/coupons');
    return data;
  },

  async getOne(id: string): Promise<Coupon> {
    const { data } = await apiClient.get<Coupon>(`/coupons/${id}`);
    return data;
  },

  async create(dto: CreateCouponDto): Promise<Coupon> {
    const { data } = await apiClient.post<Coupon>('/coupons', dto);
    return data;
  },

  async update(id: string, dto: UpdateCouponDto): Promise<Coupon> {
    const { data } = await apiClient.patch<Coupon>(`/coupons/${id}`, dto);
    return data;
  },

  async delete(id: string): Promise<void> {
    await apiClient.delete(`/coupons/${id}`);
  },

  async validate(code: string, subtotal: number): Promise<CouponValidationResult> {
    const { data } = await apiClient.post<CouponValidationResult>('/coupons/validate', {
      code,
      subtotal,
    });
    return data;
  },
};
