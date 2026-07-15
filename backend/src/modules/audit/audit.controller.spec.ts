import { Test, TestingModule } from '@nestjs/testing';
import { GUARDS_METADATA } from '@nestjs/common/constants';
import { AuditController } from './audit.controller';
import { AuditService, AuditAction } from './audit.service';
import { JwtAuthGuard } from '../admin/guards/jwt-auth.guard';

describe('AuditController', () => {
  let controller: AuditController;

  const mockAuditService = {
    getAll: jest.fn(),
    getRecent: jest.fn(),
    getStats: jest.fn(),
    getByEntity: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuditController],
      providers: [{ provide: AuditService, useValue: mockAuditService }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<AuditController>(AuditController);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should require JwtAuthGuard to access any endpoint', () => {
    const guards = Reflect.getMetadata(GUARDS_METADATA, AuditController);

    expect(guards).toBeDefined();
    expect(guards).toContain(JwtAuthGuard);
  });

  describe('getAll', () => {
    it('should delegate to auditService.getAll with parsed filters', async () => {
      const mockResult = { logs: [], total: 0 };
      mockAuditService.getAll.mockResolvedValue(mockResult);

      const result = await controller.getAll(
        AuditAction.ORDER_CREATED,
        'Order',
        'admin-1',
        '2026-01-01',
        '2026-02-01',
        '10',
        '5',
      );

      expect(result).toBe(mockResult);
      expect(mockAuditService.getAll).toHaveBeenCalledWith({
        action: AuditAction.ORDER_CREATED,
        entity: 'Order',
        adminId: 'admin-1',
        startDate: new Date('2026-01-01'),
        endDate: new Date('2026-02-01'),
        limit: 10,
        offset: 5,
      });
    });

    it('should pass undefined for optional filters when omitted', async () => {
      mockAuditService.getAll.mockResolvedValue({ logs: [], total: 0 });

      await controller.getAll();

      expect(mockAuditService.getAll).toHaveBeenCalledWith({
        action: undefined,
        entity: undefined,
        adminId: undefined,
        startDate: undefined,
        endDate: undefined,
        limit: undefined,
        offset: undefined,
      });
    });
  });

  describe('getRecent', () => {
    it('should delegate to auditService.getRecent with a parsed limit', async () => {
      const mockLogs = [{ id: 'log-1' }];
      mockAuditService.getRecent.mockResolvedValue(mockLogs);

      const result = await controller.getRecent('15');

      expect(result).toBe(mockLogs);
      expect(mockAuditService.getRecent).toHaveBeenCalledWith(15);
    });

    it('should pass undefined when no limit is given, letting the service apply its default', async () => {
      mockAuditService.getRecent.mockResolvedValue([]);

      await controller.getRecent();

      expect(mockAuditService.getRecent).toHaveBeenCalledWith(undefined);
    });
  });

  describe('getStats', () => {
    it('should delegate to auditService.getStats with a parsed number of days', async () => {
      const mockStats = { totalLogs: 3, actionCounts: {}, period: 'Last 30 days' };
      mockAuditService.getStats.mockResolvedValue(mockStats);

      const result = await controller.getStats('30');

      expect(result).toBe(mockStats);
      expect(mockAuditService.getStats).toHaveBeenCalledWith(30);
    });

    it('should pass undefined when no days is given, letting the service apply its default', async () => {
      mockAuditService.getStats.mockResolvedValue({});

      await controller.getStats();

      expect(mockAuditService.getStats).toHaveBeenCalledWith(undefined);
    });
  });

  describe('getByEntity', () => {
    it('should delegate to auditService.getByEntity with entity and entityId', async () => {
      const mockLogs = [{ id: 'log-1', entity: 'Product', entityId: 'prod-1' }];
      mockAuditService.getByEntity.mockResolvedValue(mockLogs);

      const result = await controller.getByEntity('Product', 'prod-1');

      expect(result).toBe(mockLogs);
      expect(mockAuditService.getByEntity).toHaveBeenCalledWith('Product', 'prod-1');
    });
  });
});
