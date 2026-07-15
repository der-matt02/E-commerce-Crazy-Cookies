import { Test, TestingModule } from '@nestjs/testing';
import { AuditService, AuditAction } from './audit.service';
import { PrismaService } from '../../database/prisma.service';

describe('AuditService', () => {
  let service: AuditService;

  const mockPrismaService = {
    auditLog: {
      create: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AuditService, { provide: PrismaService, useValue: mockPrismaService }],
    }).compile();

    service = module.get<AuditService>(AuditService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('log', () => {
    it('should create an audit log record with action, entity, admin and timestamps handled by prisma', async () => {
      mockPrismaService.auditLog.create.mockResolvedValue({ id: 'log-1' });

      await service.log({
        action: AuditAction.PRODUCT_CREATED,
        entity: 'Product',
        entityId: 'prod-1',
        adminId: 'admin-1',
        oldValue: { name: 'old' },
        newValue: { name: 'new' },
        ipAddress: '127.0.0.1',
        userAgent: 'jest-test',
      });

      expect(mockPrismaService.auditLog.create).toHaveBeenCalledWith({
        data: {
          action: AuditAction.PRODUCT_CREATED,
          entity: 'Product',
          entityId: 'prod-1',
          adminId: 'admin-1',
          oldValue: { name: 'old' },
          newValue: { name: 'new' },
          ipAddress: '127.0.0.1',
          userAgent: 'jest-test',
        },
      });
    });

    it('should default entityId to an empty string when not provided', async () => {
      mockPrismaService.auditLog.create.mockResolvedValue({ id: 'log-2' });

      await service.log({
        action: AuditAction.ADMIN_LOGIN,
        entity: 'Admin',
        adminId: 'admin-2',
      });

      const callArg = mockPrismaService.auditLog.create.mock.calls[0][0];
      expect(callArg.data.entityId).toBe('');
      expect(callArg.data.oldValue).toBeUndefined();
      expect(callArg.data.newValue).toBeUndefined();
    });

    it('should not throw when the prisma call fails', async () => {
      mockPrismaService.auditLog.create.mockRejectedValue(new Error('DB down'));

      await expect(
        service.log({ action: AuditAction.ADMIN_LOGOUT, entity: 'Admin' }),
      ).resolves.toBeUndefined();
    });
  });

  describe('getAll', () => {
    it('should apply default pagination when no filters are given', async () => {
      const mockLogs = [{ id: 'log-1' }];
      mockPrismaService.auditLog.findMany.mockResolvedValue(mockLogs);
      mockPrismaService.auditLog.count.mockResolvedValue(1);

      const result = await service.getAll();

      expect(result).toEqual({ logs: mockLogs, total: 1 });
      expect(mockPrismaService.auditLog.findMany).toHaveBeenCalledWith({
        where: {},
        orderBy: { createdAt: 'desc' },
        take: 50,
        skip: 0,
      });
      expect(mockPrismaService.auditLog.count).toHaveBeenCalledWith({ where: {} });
    });

    it('should build the where clause and pagination from provided filters', async () => {
      mockPrismaService.auditLog.findMany.mockResolvedValue([]);
      mockPrismaService.auditLog.count.mockResolvedValue(0);

      const startDate = new Date('2026-01-01');
      const endDate = new Date('2026-02-01');

      await service.getAll({
        action: AuditAction.ORDER_STATUS_CHANGED,
        entity: 'Order',
        adminId: 'admin-9',
        startDate,
        endDate,
        limit: 10,
        offset: 20,
      });

      expect(mockPrismaService.auditLog.findMany).toHaveBeenCalledWith({
        where: {
          action: AuditAction.ORDER_STATUS_CHANGED,
          entity: 'Order',
          adminId: 'admin-9',
          createdAt: { gte: startDate, lte: endDate },
        },
        orderBy: { createdAt: 'desc' },
        take: 10,
        skip: 20,
      });
    });
  });

  describe('getByEntity', () => {
    it('should return logs filtered by entity and entityId, most recent first', async () => {
      const mockLogs = [{ id: 'log-1', entity: 'Product', entityId: 'prod-1' }];
      mockPrismaService.auditLog.findMany.mockResolvedValue(mockLogs);

      const result = await service.getByEntity('Product', 'prod-1');

      expect(result).toEqual(mockLogs);
      expect(mockPrismaService.auditLog.findMany).toHaveBeenCalledWith({
        where: { entity: 'Product', entityId: 'prod-1' },
        orderBy: { createdAt: 'desc' },
      });
    });
  });

  describe('getRecent', () => {
    it('should return the most recent logs using the default limit of 20', async () => {
      const mockLogs = [{ id: 'log-1' }];
      mockPrismaService.auditLog.findMany.mockResolvedValue(mockLogs);

      const result = await service.getRecent();

      expect(result).toEqual(mockLogs);
      expect(mockPrismaService.auditLog.findMany).toHaveBeenCalledWith({
        orderBy: { createdAt: 'desc' },
        take: 20,
      });
    });

    it('should respect a custom limit', async () => {
      mockPrismaService.auditLog.findMany.mockResolvedValue([]);

      await service.getRecent(5);

      expect(mockPrismaService.auditLog.findMany).toHaveBeenCalledWith({
        orderBy: { createdAt: 'desc' },
        take: 5,
      });
    });
  });

  describe('getStats', () => {
    it('should aggregate action counts for the default period of 7 days', async () => {
      mockPrismaService.auditLog.findMany.mockResolvedValue([
        { action: AuditAction.PRODUCT_CREATED },
        { action: AuditAction.PRODUCT_CREATED },
        { action: AuditAction.ORDER_CREATED },
      ]);

      const result = await service.getStats();

      expect(result.totalLogs).toBe(3);
      expect(result.actionCounts).toEqual({
        [AuditAction.PRODUCT_CREATED]: 2,
        [AuditAction.ORDER_CREATED]: 1,
      });
      expect(result.period).toBe('Last 7 days');

      const callArg = mockPrismaService.auditLog.findMany.mock.calls[0][0];
      expect(callArg.select).toEqual({ action: true });
      expect(callArg.where.createdAt.gte).toBeInstanceOf(Date);
    });

    it('should honor a custom number of days', async () => {
      mockPrismaService.auditLog.findMany.mockResolvedValue([]);

      const result = await service.getStats(30);

      expect(result.period).toBe('Last 30 days');
      expect(result.totalLogs).toBe(0);
      expect(result.actionCounts).toEqual({});
    });
  });
});
