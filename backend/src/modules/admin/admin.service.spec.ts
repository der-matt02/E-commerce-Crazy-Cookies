import { Test, TestingModule } from '@nestjs/testing';
import { AdminService } from './admin.service';
import { PrismaService } from '@/database/prisma.service';

describe('AdminService', () => {
  let service: AdminService;

  const mockPrismaService = {
    product: {
      count: jest.fn(),
      findMany: jest.fn(),
    },
    category: {
      count: jest.fn(),
    },
    order: {
      count: jest.fn(),
      aggregate: jest.fn(),
      findMany: jest.fn(),
    },
    review: {
      count: jest.fn(),
    },
    orderItem: {
      groupBy: jest.fn(),
    },
    $queryRaw: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<AdminService>(AdminService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getStats', () => {
    const setupDefaults = () => {
      mockPrismaService.product.count.mockResolvedValueOnce(10); // total
      mockPrismaService.product.count.mockResolvedValueOnce(8); // active
      mockPrismaService.category.count.mockResolvedValue(4);
      mockPrismaService.order.count.mockResolvedValueOnce(20); // total orders
      mockPrismaService.order.count.mockResolvedValueOnce(3); // pending orders
      mockPrismaService.review.count.mockResolvedValueOnce(15); // total reviews
      mockPrismaService.review.count.mockResolvedValueOnce(5); // pending reviews
      mockPrismaService.$queryRaw.mockResolvedValue([{ count: BigInt(2) }]);
      mockPrismaService.order.aggregate.mockResolvedValue({ _sum: { total: 1500 } });
      mockPrismaService.order.findMany.mockResolvedValue([
        {
          id: 'order-1',
          orderNumber: 'ORD-001',
          customerName: 'Jane',
          total: 100,
          status: 'DELIVERED',
          createdAt: new Date('2024-01-01'),
        },
      ]);
      mockPrismaService.orderItem.groupBy.mockResolvedValue([
        { productId: 'prod-1', _sum: { quantity: 12 } },
      ]);
      mockPrismaService.product.findMany.mockResolvedValue([
        { id: 'prod-1', name: 'Cookie', price: 5 },
      ]);
    };

    it('should aggregate and shape the full dashboard stats object', async () => {
      setupDefaults();

      const result = await service.getStats();

      expect(result).toEqual({
        products: { total: 10, active: 8, inactive: 2, lowStock: 2 },
        categories: { total: 4 },
        orders: { total: 20, pending: 3, revenue: 1500 },
        reviews: { total: 15, pending: 5, approved: 10 },
        recentOrders: [
          {
            id: 'order-1',
            orderNumber: 'ORD-001',
            customerName: 'Jane',
            total: 100,
            status: 'DELIVERED',
            createdAt: new Date('2024-01-01'),
          },
        ],
        topProducts: [{ id: 'prod-1', name: 'Cookie', price: 5, totalSold: 12 }],
      });
    });

    it('should query active products, active categories and pending orders with correct filters', async () => {
      setupDefaults();

      await service.getStats();

      expect(mockPrismaService.product.count).toHaveBeenNthCalledWith(1);
      expect(mockPrismaService.product.count).toHaveBeenNthCalledWith(2, {
        where: { isActive: true },
      });
      expect(mockPrismaService.category.count).toHaveBeenCalledWith({
        where: { isActive: true },
      });
      expect(mockPrismaService.order.count).toHaveBeenNthCalledWith(2, {
        where: { status: 'PENDING' },
      });
      expect(mockPrismaService.review.count).toHaveBeenNthCalledWith(2, {
        where: { isApproved: false },
      });
      expect(mockPrismaService.order.aggregate).toHaveBeenCalledWith({
        where: { status: 'DELIVERED' },
        _sum: { total: true },
      });
    });

    it('should fetch the 5 most recent orders ordered by creation date desc', async () => {
      setupDefaults();

      await service.getStats();

      expect(mockPrismaService.order.findMany).toHaveBeenCalledWith({
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          orderNumber: true,
          customerName: true,
          total: true,
          status: true,
          createdAt: true,
        },
      });
    });

    it('should group the top 5 best selling products by quantity desc', async () => {
      setupDefaults();

      await service.getStats();

      expect(mockPrismaService.orderItem.groupBy).toHaveBeenCalledWith({
        by: ['productId'],
        _sum: { quantity: true },
        orderBy: { _sum: { quantity: 'desc' } },
        take: 5,
      });
    });

    it('should default revenue to 0 when there are no delivered orders', async () => {
      setupDefaults();
      mockPrismaService.order.aggregate.mockResolvedValue({ _sum: { total: null } });

      const result = await service.getStats();

      expect(result.orders.revenue).toBe(0);
    });

    it('should return zeroed product stats when the store has no products', async () => {
      mockPrismaService.product.count.mockResolvedValueOnce(0);
      mockPrismaService.product.count.mockResolvedValueOnce(0);
      mockPrismaService.category.count.mockResolvedValue(0);
      mockPrismaService.order.count.mockResolvedValue(0);
      mockPrismaService.review.count.mockResolvedValue(0);
      mockPrismaService.$queryRaw.mockResolvedValue([{ count: BigInt(0) }]);
      mockPrismaService.order.aggregate.mockResolvedValue({ _sum: { total: null } });
      mockPrismaService.order.findMany.mockResolvedValue([]);
      mockPrismaService.orderItem.groupBy.mockResolvedValue([]);
      mockPrismaService.product.findMany.mockResolvedValue([]);

      const result = await service.getStats();

      expect(result.products).toEqual({ total: 0, active: 0, inactive: 0, lowStock: 0 });
      expect(result.recentOrders).toEqual([]);
      expect(result.topProducts).toEqual([]);
      expect(mockPrismaService.product.findMany).toHaveBeenCalledWith({
        where: { id: { in: [] } },
        select: { id: true, name: true, price: true },
      });
    });

    it('should convert the raw bigint low-stock count into a regular number', async () => {
      setupDefaults();
      mockPrismaService.$queryRaw.mockResolvedValue([{ count: BigInt(9999) }]);

      const result = await service.getStats();

      expect(result.products.lowStock).toBe(9999);
      expect(typeof result.products.lowStock).toBe('number');
    });

    it('should default a top product with no matching quantity sum to 0 total sold', async () => {
      setupDefaults();
      mockPrismaService.orderItem.groupBy.mockResolvedValue([
        { productId: 'prod-1', _sum: { quantity: null } },
      ]);
      mockPrismaService.product.findMany.mockResolvedValue([
        { id: 'prod-1', name: 'Cookie', price: 5 },
      ]);

      const result = await service.getStats();

      expect(result.topProducts).toEqual([
        { id: 'prod-1', name: 'Cookie', price: 5, totalSold: 0 },
      ]);
    });

    it('should still return an entry for a top product id that no longer exists in the catalog', async () => {
      setupDefaults();
      mockPrismaService.orderItem.groupBy.mockResolvedValue([
        { productId: 'deleted-prod', _sum: { quantity: 7 } },
      ]);
      // Product was deleted after the order was placed, so findMany won't return it.
      mockPrismaService.product.findMany.mockResolvedValue([]);

      const result = await service.getStats();

      expect(result.topProducts).toEqual([{ totalSold: 7 }]);
    });

    it('should propagate errors when a prisma call fails', async () => {
      mockPrismaService.product.count.mockRejectedValueOnce(new Error('DB connection lost'));
      mockPrismaService.product.count.mockResolvedValueOnce(0);
      mockPrismaService.category.count.mockResolvedValue(0);
      mockPrismaService.order.count.mockResolvedValue(0);
      mockPrismaService.review.count.mockResolvedValue(0);
      mockPrismaService.$queryRaw.mockResolvedValue([{ count: BigInt(0) }]);

      await expect(service.getStats()).rejects.toThrow('DB connection lost');
    });

    it('should propagate errors from the raw low-stock query', async () => {
      mockPrismaService.product.count.mockResolvedValue(0);
      mockPrismaService.category.count.mockResolvedValue(0);
      mockPrismaService.order.count.mockResolvedValue(0);
      mockPrismaService.review.count.mockResolvedValue(0);
      mockPrismaService.$queryRaw.mockRejectedValue(new Error('raw query failed'));

      await expect(service.getStats()).rejects.toThrow('raw query failed');
    });
  });
});
