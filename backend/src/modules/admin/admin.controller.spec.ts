import { Test, TestingModule } from '@nestjs/testing';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

describe('AdminController', () => {
  let controller: AdminController;

  const mockAdminService = {
    getStats: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminController],
      providers: [
        {
          provide: AdminService,
          useValue: mockAdminService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: jest.fn().mockReturnValue(true) })
      .compile();

    controller = module.get<AdminController>(AdminController);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('guards', () => {
    it('should protect the controller with JwtAuthGuard', () => {
      const guards = Reflect.getMetadata('__guards__', AdminController) || [];
      expect(guards).toContain(JwtAuthGuard);
    });
  });

  describe('getStats', () => {
    it('should delegate to AdminService.getStats and return its result', async () => {
      const mockStats = {
        products: { total: 10, active: 8, inactive: 2, lowStock: 1 },
        categories: { total: 4 },
        orders: { total: 20, pending: 3, revenue: 1500 },
        reviews: { total: 15, pending: 5, approved: 10 },
        recentOrders: [],
        topProducts: [],
      };
      mockAdminService.getStats.mockResolvedValue(mockStats);

      const result = await controller.getStats();

      expect(mockAdminService.getStats).toHaveBeenCalledTimes(1);
      expect(mockAdminService.getStats).toHaveBeenCalledWith();
      expect(result).toEqual(mockStats);
    });

    it('should propagate errors thrown by AdminService.getStats without swallowing them', async () => {
      mockAdminService.getStats.mockRejectedValue(new Error('database unreachable'));

      await expect(controller.getStats()).rejects.toThrow('database unreachable');
    });

    it('should not catch or transform the error type from the service', async () => {
      class CustomError extends Error {}
      mockAdminService.getStats.mockRejectedValue(new CustomError('custom failure'));

      await expect(controller.getStats()).rejects.toBeInstanceOf(CustomError);
    });
  });
});
