import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { CouponsController } from './coupons.controller';
import { CouponsService } from './coupons.service';
import { JwtAuthGuard } from '@modules/admin/guards/jwt-auth.guard';
import { CouponType } from '@prisma/client';

describe('CouponsController', () => {
  let controller: CouponsController;

  const mockCouponsService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    validate: jest.fn(),
  };

  // JwtAuthGuard is referenced via @UseGuards() on several controller methods.
  // Nest's DependenciesScanner auto-registers guard classes found in decorator
  // metadata as providers of the enclosing testing module, so JwtAuthGuard's own
  // constructor dependency (ConfigService) must be satisfiable even though this
  // spec never exercises the guard itself (methods are called directly on the
  // controller instance, bypassing the HTTP pipeline).
  const mockConfigService = {
    get: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CouponsController],
      providers: [
        {
          provide: CouponsService,
          useValue: mockCouponsService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    controller = module.get<CouponsController>(CouponsController);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('guards', () => {
    it('should protect create with JwtAuthGuard', () => {
      const guards = Reflect.getMetadata('__guards__', CouponsController.prototype.create) || [];
      expect(guards).toContain(JwtAuthGuard);
    });

    it('should protect findAll with JwtAuthGuard', () => {
      const guards = Reflect.getMetadata('__guards__', CouponsController.prototype.findAll) || [];
      expect(guards).toContain(JwtAuthGuard);
    });

    it('should protect findOne with JwtAuthGuard', () => {
      const guards = Reflect.getMetadata('__guards__', CouponsController.prototype.findOne) || [];
      expect(guards).toContain(JwtAuthGuard);
    });

    it('should protect update with JwtAuthGuard', () => {
      const guards = Reflect.getMetadata('__guards__', CouponsController.prototype.update) || [];
      expect(guards).toContain(JwtAuthGuard);
    });

    it('should protect remove with JwtAuthGuard', () => {
      const guards = Reflect.getMetadata('__guards__', CouponsController.prototype.remove) || [];
      expect(guards).toContain(JwtAuthGuard);
    });

    it('should NOT protect validate with a guard (public checkout endpoint)', () => {
      const guards = Reflect.getMetadata('__guards__', CouponsController.prototype.validate) || [];
      expect(guards).not.toContain(JwtAuthGuard);
      expect(guards.length).toBe(0);
    });
  });

  describe('create', () => {
    it('should delegate to CouponsService.create with the DTO and return its result', async () => {
      const dto = { code: 'VERANO10', type: CouponType.PERCENTAGE, value: 10 };
      const created = { id: 'coupon-1', ...dto };
      mockCouponsService.create.mockResolvedValue(created);

      const result = await controller.create(dto as never);

      expect(mockCouponsService.create).toHaveBeenCalledWith(dto);
      expect(result).toEqual(created);
    });

    it('should propagate errors thrown by the service without swallowing them', async () => {
      const dto = { code: 'VERANO10', type: CouponType.PERCENTAGE, value: 10 };
      mockCouponsService.create.mockRejectedValue(new Error('duplicate code'));

      await expect(controller.create(dto as never)).rejects.toThrow('duplicate code');
    });
  });

  describe('findAll', () => {
    it('should delegate to CouponsService.findAll', async () => {
      const coupons = [{ id: 'c1' }, { id: 'c2' }];
      mockCouponsService.findAll.mockResolvedValue(coupons);

      const result = await controller.findAll();

      expect(mockCouponsService.findAll).toHaveBeenCalledWith();
      expect(result).toEqual(coupons);
    });
  });

  describe('validate', () => {
    it('should delegate to CouponsService.validate with code and subtotal', async () => {
      const dto = { code: 'VERANO10', subtotal: 50000 };
      const validated = { coupon: { id: 'coupon-1' }, discount: 5000 };
      mockCouponsService.validate.mockResolvedValue(validated);

      const result = await controller.validate(dto);

      expect(mockCouponsService.validate).toHaveBeenCalledWith(dto.code, dto.subtotal);
      expect(result).toEqual(validated);
    });

    it('should propagate BadRequestException-like errors from the service', async () => {
      const dto = { code: 'EXPIRED', subtotal: 50000 };
      mockCouponsService.validate.mockRejectedValue(new Error('El cupón ha expirado'));

      await expect(controller.validate(dto)).rejects.toThrow('El cupón ha expirado');
    });
  });

  describe('findOne', () => {
    it('should delegate to CouponsService.findOne with the id', async () => {
      const coupon = { id: 'coupon-1' };
      mockCouponsService.findOne.mockResolvedValue(coupon);

      const result = await controller.findOne('coupon-1');

      expect(mockCouponsService.findOne).toHaveBeenCalledWith('coupon-1');
      expect(result).toEqual(coupon);
    });

    it('should propagate NotFoundException-like errors from the service', async () => {
      mockCouponsService.findOne.mockRejectedValue(new Error('not found'));

      await expect(controller.findOne('missing-id')).rejects.toThrow('not found');
    });
  });

  describe('update', () => {
    it('should delegate to CouponsService.update with id and dto', async () => {
      const dto = { value: 20 };
      const updated = { id: 'coupon-1', value: 20 };
      mockCouponsService.update.mockResolvedValue(updated);

      const result = await controller.update('coupon-1', dto);

      expect(mockCouponsService.update).toHaveBeenCalledWith('coupon-1', dto);
      expect(result).toEqual(updated);
    });
  });

  describe('remove', () => {
    it('should delegate to CouponsService.remove with the id', async () => {
      const removed = { id: 'coupon-1' };
      mockCouponsService.remove.mockResolvedValue(removed);

      const result = await controller.remove('coupon-1');

      expect(mockCouponsService.remove).toHaveBeenCalledWith('coupon-1');
      expect(result).toEqual(removed);
    });
  });
});
