import { Test, TestingModule } from '@nestjs/testing';
import { CouponsService } from './coupons.service';
import { PrismaService } from '@/database/prisma.service';
import { NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { CouponType, Coupon } from '@prisma/client';

describe('CouponsService', () => {
  let service: CouponsService;

  const mockPrismaService = {
    coupon: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  };

  const buildCoupon = (overrides: Partial<Coupon> = {}): Coupon =>
    ({
      id: 'coupon-1',
      code: 'VERANO10',
      type: CouponType.PERCENTAGE,
      value: 10 as unknown as Coupon['value'],
      minPurchase: null,
      maxUses: null,
      usedCount: 0,
      isActive: true,
      expiresAt: null,
      createdAt: new Date('2026-01-01'),
      updatedAt: new Date('2026-01-01'),
      ...overrides,
    }) as Coupon;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CouponsService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<CouponsService>(CouponsService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    const dto = {
      code: 'verano10',
      type: CouponType.PERCENTAGE,
      value: 10,
    };

    it('should create a coupon, trimming and uppercasing the code', async () => {
      mockPrismaService.coupon.findUnique.mockResolvedValue(null);
      const created = buildCoupon();
      mockPrismaService.coupon.create.mockResolvedValue(created);

      const result = await service.create({ ...dto, code: '  verano10  ' });

      expect(mockPrismaService.coupon.findUnique).toHaveBeenCalledWith({
        where: { code: 'VERANO10' },
      });
      expect(mockPrismaService.coupon.create).toHaveBeenCalledWith({
        data: { type: dto.type, value: dto.value, code: 'VERANO10' },
      });
      expect(result).toEqual(created);
    });

    it('should reject a duplicate coupon code', async () => {
      mockPrismaService.coupon.findUnique.mockResolvedValue(buildCoupon());

      await expect(service.create(dto)).rejects.toThrow(ConflictException);
      expect(mockPrismaService.coupon.create).not.toHaveBeenCalled();
    });

    it('should not validate negative/zero value at the service level (DTO-only via class-validator @Min(0.01))', async () => {
      // Documents current behavior: CouponsService.create() performs no business-rule
      // validation on `value` itself — that is delegated entirely to CreateCouponDto's
      // @Min(0.01) decorator, enforced only when a ValidationPipe runs in front of the
      // controller (e2e/HTTP layer). A direct service call with value <= 0 is NOT rejected.
      mockPrismaService.coupon.findUnique.mockResolvedValue(null);
      const created = buildCoupon({ value: -5 as unknown as Coupon['value'] });
      mockPrismaService.coupon.create.mockResolvedValue(created);

      await expect(service.create({ ...dto, value: -5 })).resolves.toEqual(created);
    });

    it('should not cap PERCENTAGE value at 100 at the service level (no such DTO/service validation exists)', async () => {
      // Documents current behavior: neither CreateCouponDto nor CouponsService.create()
      // enforce value <= 100 for PERCENTAGE coupons. A coupon with value=150 can be
      // created. This is not a monetary bug in practice because CouponsService.validate()
      // clamps the resulting discount to the subtotal via Math.min (see validate() tests),
      // but it is a data-integrity gap worth flagging.
      mockPrismaService.coupon.findUnique.mockResolvedValue(null);
      const created = buildCoupon({ value: 150 as unknown as Coupon['value'] });
      mockPrismaService.coupon.create.mockResolvedValue(created);

      await expect(
        service.create({ ...dto, type: CouponType.PERCENTAGE, value: 150 }),
      ).resolves.toEqual(created);
    });
  });

  describe('findAll', () => {
    it('should return all coupons ordered by createdAt desc', async () => {
      const coupons = [buildCoupon({ id: 'c1' }), buildCoupon({ id: 'c2' })];
      mockPrismaService.coupon.findMany.mockResolvedValue(coupons);

      const result = await service.findAll();

      expect(mockPrismaService.coupon.findMany).toHaveBeenCalledWith({
        orderBy: { createdAt: 'desc' },
      });
      expect(result).toEqual(coupons);
    });
  });

  describe('findOne', () => {
    it('should return the coupon when found', async () => {
      const coupon = buildCoupon();
      mockPrismaService.coupon.findUnique.mockResolvedValue(coupon);

      const result = await service.findOne('coupon-1');

      expect(mockPrismaService.coupon.findUnique).toHaveBeenCalledWith({
        where: { id: 'coupon-1' },
      });
      expect(result).toEqual(coupon);
    });

    it('should throw NotFoundException when the coupon does not exist', async () => {
      mockPrismaService.coupon.findUnique.mockResolvedValue(null);

      await expect(service.findOne('missing-id')).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should throw NotFoundException when the coupon does not exist', async () => {
      mockPrismaService.coupon.findUnique.mockResolvedValue(null);

      await expect(service.update('missing-id', { value: 20 })).rejects.toThrow(NotFoundException);
      expect(mockPrismaService.coupon.update).not.toHaveBeenCalled();
    });

    it('should update fields without touching the code when code is not provided', async () => {
      const existing = buildCoupon();
      mockPrismaService.coupon.findUnique.mockResolvedValueOnce(existing); // findOne() check
      const updated = buildCoupon({ value: 25 as unknown as Coupon['value'] });
      mockPrismaService.coupon.update.mockResolvedValue(updated);

      const result = await service.update('coupon-1', { value: 25 });

      expect(mockPrismaService.coupon.findUnique).toHaveBeenCalledTimes(1);
      expect(mockPrismaService.coupon.update).toHaveBeenCalledWith({
        where: { id: 'coupon-1' },
        data: { value: 25 },
      });
      expect(result).toEqual(updated);
    });

    it('should normalize and allow a code change when the new code is free', async () => {
      const existing = buildCoupon();
      mockPrismaService.coupon.findUnique
        .mockResolvedValueOnce(existing) // findOne()
        .mockResolvedValueOnce(null); // duplicate-code check
      const updated = buildCoupon({ code: 'NUEVO20' });
      mockPrismaService.coupon.update.mockResolvedValue(updated);

      const result = await service.update('coupon-1', { code: '  nuevo20  ' });

      expect(mockPrismaService.coupon.findUnique).toHaveBeenNthCalledWith(2, {
        where: { code: 'NUEVO20' },
      });
      expect(mockPrismaService.coupon.update).toHaveBeenCalledWith({
        where: { id: 'coupon-1' },
        data: { code: 'NUEVO20' },
      });
      expect(result).toEqual(updated);
    });

    it('should allow updating a coupon to the same code it already has', async () => {
      const existing = buildCoupon({ id: 'coupon-1', code: 'VERANO10' });
      mockPrismaService.coupon.findUnique
        .mockResolvedValueOnce(existing) // findOne()
        .mockResolvedValueOnce(existing); // duplicate-code check finds itself
      mockPrismaService.coupon.update.mockResolvedValue(existing);

      await expect(service.update('coupon-1', { code: 'verano10' })).resolves.toEqual(existing);
      expect(mockPrismaService.coupon.update).toHaveBeenCalled();
    });

    it('should reject a code change to a code already used by another coupon', async () => {
      const existing = buildCoupon({ id: 'coupon-1', code: 'VERANO10' });
      const other = buildCoupon({ id: 'coupon-2', code: 'NUEVO20' });
      mockPrismaService.coupon.findUnique
        .mockResolvedValueOnce(existing) // findOne()
        .mockResolvedValueOnce(other); // duplicate-code check finds a different coupon

      await expect(service.update('coupon-1', { code: 'NUEVO20' })).rejects.toThrow(
        ConflictException,
      );
      expect(mockPrismaService.coupon.update).not.toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('should delete the coupon when it exists', async () => {
      const existing = buildCoupon();
      mockPrismaService.coupon.findUnique.mockResolvedValue(existing);
      mockPrismaService.coupon.delete.mockResolvedValue(existing);

      const result = await service.remove('coupon-1');

      expect(mockPrismaService.coupon.delete).toHaveBeenCalledWith({ where: { id: 'coupon-1' } });
      expect(result).toEqual(existing);
    });

    it('should throw NotFoundException when the coupon does not exist', async () => {
      mockPrismaService.coupon.findUnique.mockResolvedValue(null);

      await expect(service.remove('missing-id')).rejects.toThrow(NotFoundException);
      expect(mockPrismaService.coupon.delete).not.toHaveBeenCalled();
    });
  });

  describe('validate', () => {
    it('should reject a code that does not exist', async () => {
      mockPrismaService.coupon.findUnique.mockResolvedValue(null);

      await expect(service.validate('DOESNOTEXIST', 10000)).rejects.toThrow(BadRequestException);
    });

    it('should normalize the code before looking it up (trim + uppercase)', async () => {
      mockPrismaService.coupon.findUnique.mockResolvedValue(null);

      await expect(service.validate('  verano10  ', 10000)).rejects.toThrow(BadRequestException);
      expect(mockPrismaService.coupon.findUnique).toHaveBeenCalledWith({
        where: { code: 'VERANO10' },
      });
    });

    it('should reject an inactive coupon', async () => {
      mockPrismaService.coupon.findUnique.mockResolvedValue(buildCoupon({ isActive: false }));

      await expect(service.validate('VERANO10', 10000)).rejects.toThrow(BadRequestException);
    });

    it('should reject an expired coupon', async () => {
      const expired = buildCoupon({ expiresAt: new Date('2020-01-01') });
      mockPrismaService.coupon.findUnique.mockResolvedValue(expired);

      await expect(service.validate('VERANO10', 10000)).rejects.toThrow(BadRequestException);
    });

    it('should accept a coupon with a future expiration date', async () => {
      const future = buildCoupon({
        expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24),
        value: 10 as unknown as Coupon['value'],
      });
      mockPrismaService.coupon.findUnique.mockResolvedValue(future);

      await expect(service.validate('VERANO10', 10000)).resolves.toEqual({
        coupon: future,
        discount: 1000,
      });
    });

    it('should accept a coupon with no expiration date (expiresAt null)', async () => {
      const noExpiry = buildCoupon({ expiresAt: null });
      mockPrismaService.coupon.findUnique.mockResolvedValue(noExpiry);

      await expect(service.validate('VERANO10', 10000)).resolves.toEqual({
        coupon: noExpiry,
        discount: 1000,
      });
    });

    it('should reject a coupon that has reached its maxUses (usedCount >= maxUses)', async () => {
      const exhausted = buildCoupon({ maxUses: 5, usedCount: 5 });
      mockPrismaService.coupon.findUnique.mockResolvedValue(exhausted);

      await expect(service.validate('VERANO10', 10000)).rejects.toThrow(BadRequestException);
    });

    it('should reject a coupon that has exceeded its maxUses (usedCount > maxUses)', async () => {
      const exhausted = buildCoupon({ maxUses: 5, usedCount: 6 });
      mockPrismaService.coupon.findUnique.mockResolvedValue(exhausted);

      await expect(service.validate('VERANO10', 10000)).rejects.toThrow(BadRequestException);
    });

    it('should accept a coupon just below its maxUses limit', async () => {
      const almostExhausted = buildCoupon({ maxUses: 5, usedCount: 4 });
      mockPrismaService.coupon.findUnique.mockResolvedValue(almostExhausted);

      await expect(service.validate('VERANO10', 10000)).resolves.toEqual({
        coupon: almostExhausted,
        discount: 1000,
      });
    });

    it('should accept a coupon with maxUses null (unlimited uses)', async () => {
      const unlimited = buildCoupon({ maxUses: null, usedCount: 9999 });
      mockPrismaService.coupon.findUnique.mockResolvedValue(unlimited);

      await expect(service.validate('VERANO10', 10000)).resolves.toEqual({
        coupon: unlimited,
        discount: 1000,
      });
    });

    it('should reject when the subtotal is below minPurchase', async () => {
      const withMinPurchase = buildCoupon({ minPurchase: 50000 as unknown as Coupon['value'] });
      mockPrismaService.coupon.findUnique.mockResolvedValue(withMinPurchase);

      await expect(service.validate('VERANO10', 20000)).rejects.toThrow(BadRequestException);
    });

    it('should accept when the subtotal exactly equals minPurchase (boundary)', async () => {
      const withMinPurchase = buildCoupon({ minPurchase: 50000 as unknown as Coupon['value'] });
      mockPrismaService.coupon.findUnique.mockResolvedValue(withMinPurchase);

      await expect(service.validate('VERANO10', 50000)).resolves.toEqual({
        coupon: withMinPurchase,
        discount: 5000,
      });
    });

    it('should accept any subtotal when minPurchase is 0 (falsy, treated as no restriction)', async () => {
      // NOTE: because the guard is `if (coupon.minPurchase && ...)`, a minPurchase of 0
      // is falsy and short-circuits the check entirely — equivalent to "no minimum",
      // which is the intended behavior, but worth flagging as an implicit assumption.
      const zeroMinPurchase = buildCoupon({ minPurchase: 0 as unknown as Coupon['value'] });
      mockPrismaService.coupon.findUnique.mockResolvedValue(zeroMinPurchase);

      await expect(service.validate('VERANO10', 1)).resolves.toEqual({
        coupon: zeroMinPurchase,
        discount: 0.1,
      });
    });

    it('should calculate the discount correctly for a PERCENTAGE coupon', async () => {
      const percentageCoupon = buildCoupon({
        type: CouponType.PERCENTAGE,
        value: 25 as unknown as Coupon['value'],
      });
      mockPrismaService.coupon.findUnique.mockResolvedValue(percentageCoupon);

      const result = await service.validate('VERANO10', 80000);

      expect(result.discount).toBe(20000);
    });

    it('should calculate the discount correctly for a FIXED coupon', async () => {
      const fixedCoupon = buildCoupon({
        type: CouponType.FIXED,
        value: 5000 as unknown as Coupon['value'],
      });
      mockPrismaService.coupon.findUnique.mockResolvedValue(fixedCoupon);

      const result = await service.validate('VERANO10', 20000);

      expect(result.discount).toBe(5000);
    });

    it('should clamp the FIXED discount to the subtotal instead of going negative', async () => {
      // Real-money edge case: a FIXED coupon worth more than the purchase itself.
      // CouponsService.validate() already guards this via Math.min(value, subtotal),
      // so the discount never exceeds subtotal and total (subtotal + tax - discount)
      // never goes negative. This is NOT a bug — documenting the safe behavior.
      const bigFixedCoupon = buildCoupon({
        type: CouponType.FIXED,
        value: 50000 as unknown as Coupon['value'],
      });
      mockPrismaService.coupon.findUnique.mockResolvedValue(bigFixedCoupon);

      const result = await service.validate('VERANO10', 20000);

      expect(result.discount).toBe(20000);
      expect(result.discount).toBeLessThanOrEqual(20000);
    });

    it('should clamp the PERCENTAGE discount to the subtotal even when value > 100', async () => {
      // Same safety net applies to a (currently unvalidated) PERCENTAGE value > 100:
      // Math.min(subtotal * (value/100), subtotal) keeps the discount from exceeding
      // the subtotal, so a "150% off" coupon behaves like a 100%-off coupon rather
      // than creating a negative total.
      const overPercentageCoupon = buildCoupon({
        type: CouponType.PERCENTAGE,
        value: 150 as unknown as Coupon['value'],
      });
      mockPrismaService.coupon.findUnique.mockResolvedValue(overPercentageCoupon);

      const result = await service.validate('VERANO10', 20000);

      expect(result.discount).toBe(20000);
    });

    it('should return the coupon entity alongside the computed discount', async () => {
      const coupon = buildCoupon();
      mockPrismaService.coupon.findUnique.mockResolvedValue(coupon);

      const result = await service.validate('VERANO10', 10000);

      expect(result.coupon).toEqual(coupon);
    });
  });
});
