import { Test, TestingModule } from '@nestjs/testing';
import { OrdersService } from './orders.service';
import { PrismaService } from '../../database/prisma.service';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { OrderStatus } from '@prisma/client';

describe('OrdersService', () => {
  let service: OrdersService;
  let _prisma: PrismaService;

  const mockPrismaService = {
    cart: {
      findFirst: jest.fn(),
    },
    order: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
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
    it('should throw error when cart is empty', async () => {
      mockPrismaService.cart.findFirst.mockResolvedValue({
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
      mockPrismaService.cart.findFirst.mockResolvedValue(null);

      await expect(
        service.create('invalid-session', {
          customerName: 'Test',
          customerPhone: '3001234567',
          deliveryAddress: 'Address',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('findAll', () => {
    it('should return all orders', async () => {
      const mockOrders = [
        { id: 'order-1', status: OrderStatus.PENDING },
        { id: 'order-2', status: OrderStatus.CONFIRMED },
      ];

      mockPrismaService.order.findMany.mockResolvedValue(mockOrders);

      const result = await service.findAll();

      expect(result).toEqual(mockOrders);
      expect(mockPrismaService.order.findMany).toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('should return order by id', async () => {
      const orderId = 'order-1';
      const mockOrder = {
        id: orderId,
        status: OrderStatus.PENDING,
        items: [],
      };

      mockPrismaService.order.findUnique.mockResolvedValue(mockOrder);

      const result = await service.findOne(orderId);

      expect(result).toEqual(mockOrder);
    });

    it('should throw error when order not found', async () => {
      mockPrismaService.order.findUnique.mockResolvedValue(null);

      await expect(service.findOne('invalid-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('updateStatus', () => {
    it('should throw error when order not found', async () => {
      mockPrismaService.order.findUnique.mockResolvedValue(null);

      await expect(
        service.updateStatus('invalid-id', { status: OrderStatus.CONFIRMED }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw error for invalid status transition', async () => {
      mockPrismaService.order.findUnique.mockResolvedValue({
        id: 'order-1',
        status: OrderStatus.DELIVERED,
      });

      await expect(
        service.updateStatus('order-1', { status: OrderStatus.PENDING }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getByStatus', () => {
    it('should return orders by status', async () => {
      const mockOrders = [
        { id: 'order-1', status: OrderStatus.PENDING },
      ];

      mockPrismaService.order.findMany.mockResolvedValue(mockOrders);

      const result = await service.getByStatus(OrderStatus.PENDING);

      expect(result).toEqual(mockOrders);
    });
  });
});
