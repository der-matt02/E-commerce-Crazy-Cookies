import { Test, TestingModule } from '@nestjs/testing';
import { OrdersService } from './orders.service';
import { PrismaService } from '../../database/prisma.service';
import { NotFoundException, BadRequestException } from '@nestjs/common';

describe('OrdersService', () => {
  let service: OrdersService;
  let prisma: PrismaService;

  const mockPrismaService = {
    cart: {
      findUnique: jest.fn(),
      delete: jest.fn(),
    },
    cartItem: {
      deleteMany: jest.fn(),
    },
    product: {
      findUnique: jest.fn(),
    },
    order: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    orderItem: {
      create: jest.fn(),
    },
    orderStatusHistory: {
      create: jest.fn(),
    },
    inventory: {
      update: jest.fn(),
    },
    inventoryMovement: {
      create: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrdersService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<OrdersService>(OrdersService);
    prisma = module.get<PrismaService>(PrismaService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create order from cart successfully', async () => {
      const sessionId = 'session-123';
      const dto = {
        customerName: 'John Doe',
        customerPhone: '3001234567',
        customerEmail: 'john@example.com',
        deliveryAddress: 'Calle 123 #45-67',
        notes: 'Test notes',
      };

      const mockCart = {
        id: 'cart-1',
        sessionId,
        items: [
          {
            id: 'item-1',
            productId: 'product-1',
            quantity: 2,
            priceAtAdd: 10000,
            product: {
              id: 'product-1',
              name: 'Test Product',
              isActive: true,
              inventory: {
                stockAvailable: 10,
                stockReserved: 2,
              },
            },
          },
        ],
      };

      const mockOrder = {
        id: 'order-1',
        customerName: dto.customerName,
        customerPhone: dto.customerPhone,
        subtotal: 20000,
        tax: 3800,
        total: 23800,
        status: 'PENDING',
      };

      mockPrismaService.cart.findUnique.mockResolvedValue(mockCart);
      mockPrismaService.product.findUnique.mockResolvedValue({
        id: 'product-1',
        isActive: true,
        inventory: { stockAvailable: 10, stockReserved: 2 },
      });

      // Mock transaction
      mockPrismaService.$transaction.mockImplementation(async (callback) => {
        const prismaClient = {
          order: { create: jest.fn().mockResolvedValue(mockOrder) },
          orderItem: { create: jest.fn() },
          inventory: { update: jest.fn() },
          inventoryMovement: { create: jest.fn() },
          cartItem: { deleteMany: jest.fn() },
          cart: { delete: jest.fn() },
        };
        return await callback(prismaClient);
      });

      const result = await service.create(sessionId, dto);

      expect(result).toBeDefined();
      expect(mockPrismaService.$transaction).toHaveBeenCalled();
    });

    it('should throw error when cart is empty', async () => {
      mockPrismaService.cart.findUnique.mockResolvedValue({
        id: 'cart-1',
        items: [],
      });

      await expect(
        service.create('session-123', {
          customerName: 'Test',
          customerPhone: '3001234567',
          deliveryAddress: 'Address',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw error when cart not found', async () => {
      mockPrismaService.cart.findUnique.mockResolvedValue(null);

      await expect(
        service.create('invalid-session', {
          customerName: 'Test',
          customerPhone: '3001234567',
          deliveryAddress: 'Address',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw error when product is inactive', async () => {
      mockPrismaService.cart.findUnique.mockResolvedValue({
        id: 'cart-1',
        items: [
          {
            id: 'item-1',
            productId: 'product-1',
            quantity: 2,
            product: { id: 'product-1', isActive: false },
          },
        ],
      });

      await expect(
        service.create('session-123', {
          customerName: 'Test',
          customerPhone: '3001234567',
          deliveryAddress: 'Address',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('updateStatus', () => {
    it('should update order status successfully', async () => {
      const orderId = 'order-1';
      const dto = { status: 'CONFIRMED' as const, note: 'Order confirmed' };

      mockPrismaService.order.findUnique.mockResolvedValue({
        id: orderId,
        status: 'PENDING',
      });

      mockPrismaService.order.update.mockResolvedValue({
        id: orderId,
        status: 'CONFIRMED',
      });

      mockPrismaService.orderStatusHistory.create.mockResolvedValue({
        id: 'history-1',
        orderId,
        status: 'CONFIRMED',
        note: dto.note,
      });

      const result = await service.updateStatus(orderId, dto);

      expect(result).toBeDefined();
      expect(mockPrismaService.order.update).toHaveBeenCalledWith({
        where: { id: orderId },
        data: { status: dto.status },
        include: expect.any(Object),
      });
      expect(mockPrismaService.orderStatusHistory.create).toHaveBeenCalled();
    });

    it('should throw error when order not found', async () => {
      mockPrismaService.order.findUnique.mockResolvedValue(null);

      await expect(
        service.updateStatus('invalid-id', { status: 'CONFIRMED' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw error for invalid status transition', async () => {
      mockPrismaService.order.findUnique.mockResolvedValue({
        id: 'order-1',
        status: 'DELIVERED',
      });

      await expect(
        service.updateStatus('order-1', { status: 'PENDING' }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getAll', () => {
    it('should return all orders', async () => {
      const mockOrders = [
        { id: 'order-1', status: 'PENDING' },
        { id: 'order-2', status: 'CONFIRMED' },
      ];

      mockPrismaService.order.findMany.mockResolvedValue(mockOrders);

      const result = await service.getAll();

      expect(result).toEqual(mockOrders);
      expect(mockPrismaService.order.findMany).toHaveBeenCalled();
    });
  });

  describe('getOne', () => {
    it('should return order by id', async () => {
      const orderId = 'order-1';
      const mockOrder = {
        id: orderId,
        status: 'PENDING',
        items: [],
      };

      mockPrismaService.order.findUnique.mockResolvedValue(mockOrder);

      const result = await service.getOne(orderId);

      expect(result).toEqual(mockOrder);
    });

    it('should throw error when order not found', async () => {
      mockPrismaService.order.findUnique.mockResolvedValue(null);

      await expect(service.getOne('invalid-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
