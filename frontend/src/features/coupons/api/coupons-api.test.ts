import { describe, it, expect, vi, beforeEach } from 'vitest';
import { couponsApi } from './coupons-api';
import { apiClient } from '@/lib/api-client';
import { CouponType } from '@/types/coupon.types';
import type { Coupon, CreateCouponDto, UpdateCouponDto } from '@/types/coupon.types';

vi.mock('@/lib/api-client', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

const mockedApiClient = vi.mocked(apiClient, true);

function buildCoupon(overrides: Partial<Coupon> = {}): Coupon {
  return {
    id: 'coupon-1',
    code: 'SAVE10',
    type: CouponType.PERCENTAGE,
    value: 10,
    minPurchase: null,
    maxUses: null,
    usedCount: 0,
    isActive: true,
    expiresAt: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('couponsApi', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('getAll() fetches /coupons and returns the list', async () => {
    const coupons = [buildCoupon()];
    mockedApiClient.get.mockResolvedValue({ data: coupons });

    const result = await couponsApi.getAll();

    expect(mockedApiClient.get).toHaveBeenCalledWith('/coupons');
    expect(result).toBe(coupons);
  });

  it('getOne() fetches /coupons/:id and returns the coupon', async () => {
    const coupon = buildCoupon();
    mockedApiClient.get.mockResolvedValue({ data: coupon });

    const result = await couponsApi.getOne('coupon-1');

    expect(mockedApiClient.get).toHaveBeenCalledWith('/coupons/coupon-1');
    expect(result).toBe(coupon);
  });

  it('create() posts to /coupons with the dto and returns the created coupon', async () => {
    const coupon = buildCoupon();
    mockedApiClient.post.mockResolvedValue({ data: coupon });
    const dto: CreateCouponDto = { code: 'SAVE10', type: CouponType.PERCENTAGE, value: 10 };

    const result = await couponsApi.create(dto);

    expect(mockedApiClient.post).toHaveBeenCalledWith('/coupons', dto);
    expect(result).toBe(coupon);
  });

  it('update() patches /coupons/:id with the dto and returns the updated coupon', async () => {
    const coupon = buildCoupon({ isActive: false });
    mockedApiClient.patch.mockResolvedValue({ data: coupon });
    const dto: UpdateCouponDto = { isActive: false };

    const result = await couponsApi.update('coupon-1', dto);

    expect(mockedApiClient.patch).toHaveBeenCalledWith('/coupons/coupon-1', dto);
    expect(result).toBe(coupon);
  });

  it('delete() calls DELETE /coupons/:id', async () => {
    mockedApiClient.delete.mockResolvedValue({ data: undefined });

    await couponsApi.delete('coupon-1');

    expect(mockedApiClient.delete).toHaveBeenCalledWith('/coupons/coupon-1');
  });

  it('validate() posts { code, subtotal } to /coupons/validate and returns the validation result', async () => {
    const validationResult = { coupon: buildCoupon(), discount: 5 };
    mockedApiClient.post.mockResolvedValue({ data: validationResult });

    const result = await couponsApi.validate('SAVE10', 50);

    expect(mockedApiClient.post).toHaveBeenCalledWith('/coupons/validate', {
      code: 'SAVE10',
      subtotal: 50,
    });
    expect(result).toBe(validationResult);
  });

  it('validate() forwards a zero subtotal correctly', async () => {
    const validationResult = { coupon: buildCoupon(), discount: 0 };
    mockedApiClient.post.mockResolvedValue({ data: validationResult });

    await couponsApi.validate('SAVE10', 0);

    expect(mockedApiClient.post).toHaveBeenCalledWith('/coupons/validate', {
      code: 'SAVE10',
      subtotal: 0,
    });
  });
});
