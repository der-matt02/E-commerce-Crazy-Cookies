import { Test, TestingModule } from '@nestjs/testing';
import { OrdersService } from './orders.service';
import { PrismaService } from '../../database/prisma.service';
import { CouponsService } from '../coupons/coupons.service';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { OrderStatus } from '@prisma/client';

describe('OrdersService', () => {
  let service: OrdersService;

  const mockPrismaService = {
    cart: {
      findFirst: jest.fn(),
    },
    order: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  const mockCouponsService = {
    validate: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrdersService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: CouponsService,
          useValue: mockCouponsService,
        },
      ],
    }).compile();

    service = module.get<OrdersService>(OrdersService);
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
    it('should return paginated orders', async () => {
      const mockOrders = [
        { id: 'order-1', status: OrderStatus.PENDING },
        { id: 'order-2', status: OrderStatus.CONFIRMED },
      ];

      mockPrismaService.order.findMany.mockResolvedValue(mockOrders);
      mockPrismaService.order.count.mockResolvedValue(2);

      const result = await service.findAll();

      expect(result.orders).toEqual(mockOrders);
      expect(result.pagination.total).toBe(2);
      expect(mockPrismaService.order.findMany).toHaveBeenCalled();
      expect(mockPrismaService.order.count).toHaveBeenCalled();
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

      await expect(service.findOne('invalid-id')).rejects.toThrow(NotFoundException);
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
      const mockOrders = [{ id: 'order-1', status: OrderStatus.PENDING }];

      mockPrismaService.order.findMany.mockResolvedValue(mockOrders);

      const result = await service.getByStatus(OrderStatus.PENDING);

      expect(result).toEqual(mockOrders);
    });
  });

  // --- Casos límite y adversariales agregados ---

  describe('create - casos adversariales', () => {
    const validPayload = {
      customerName: 'Test User',
      customerPhone: '3001234567',
      deliveryAddress: 'Calle Falsa 123, Bogotá',
    };

    it('should reject and NOT touch stock/transaction when coupon validation fails', async () => {
      const cart = {
        id: 'cart-1',
        items: [
          {
            productId: 'product-1',
            quantity: 2,
            price: 5000,
            product: {
              name: 'Cookie',
              isActive: true,
              inventory: { id: 'inv-1', stockAvailable: 10, stockReserved: 0 },
            },
          },
        ],
      };
      mockPrismaService.cart.findFirst.mockResolvedValue(cart);
      mockCouponsService.validate.mockRejectedValue(new BadRequestException('Cupón inválido'));

      await expect(
        service.create('session-123', { ...validPayload, couponCode: 'INVALIDO' }),
      ).rejects.toThrow(BadRequestException);

      expect(mockCouponsService.validate).toHaveBeenCalledWith('INVALIDO', 10000);
      expect(mockPrismaService.$transaction).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException and NOT start the transaction when an item has insufficient stock', async () => {
      const cart = {
        id: 'cart-1',
        items: [
          {
            productId: 'product-1',
            quantity: 20,
            price: 5000,
            product: {
              name: 'Cookie',
              isActive: true,
              inventory: { id: 'inv-1', stockAvailable: 10, stockReserved: 5 }, // disponible = 5
            },
          },
        ],
      };
      mockPrismaService.cart.findFirst.mockResolvedValue(cart);

      await expect(service.create('session-123', validPayload)).rejects.toThrow(
        BadRequestException,
      );

      expect(mockPrismaService.$transaction).not.toHaveBeenCalled();
      // La validación de stock ocurre antes de validar el cupón.
      expect(mockCouponsService.validate).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException when a cart item product is no longer active', async () => {
      const cart = {
        id: 'cart-1',
        items: [
          {
            productId: 'product-1',
            quantity: 1,
            price: 5000,
            product: {
              name: 'Cookie descontinuada',
              isActive: false,
              inventory: { id: 'inv-1', stockAvailable: 10, stockReserved: 0 },
            },
          },
        ],
      };
      mockPrismaService.cart.findFirst.mockResolvedValue(cart);

      await expect(service.create('session-123', validPayload)).rejects.toThrow(
        BadRequestException,
      );
      expect(mockPrismaService.$transaction).not.toHaveBeenCalled();
    });
  });

  describe('updateStatus - todas las transiciones inválidas', () => {
    // Réplica de la tabla de transiciones válidas del service, usada solo para generar
    // exhaustivamente todos los pares (from, to) que DEBEN ser rechazados.
    const validTransitions: Record<OrderStatus, OrderStatus[]> = {
      [OrderStatus.PENDING]: [OrderStatus.CONFIRMED, OrderStatus.CANCELLED],
      [OrderStatus.CONFIRMED]: [OrderStatus.IN_PROCESS, OrderStatus.CANCELLED],
      [OrderStatus.IN_PROCESS]: [OrderStatus.READY, OrderStatus.CANCELLED],
      [OrderStatus.READY]: [OrderStatus.DELIVERED, OrderStatus.CANCELLED],
      [OrderStatus.DELIVERED]: [],
      [OrderStatus.CANCELLED]: [],
    };
    const allStatuses = Object.values(OrderStatus);
    const invalidPairs: [OrderStatus, OrderStatus][] = [];
    for (const from of allStatuses) {
      for (const to of allStatuses) {
        // eslint-disable-next-line security/detect-object-injection -- from is a member of the OrderStatus enum via Object.values(), not external input
        if (!validTransitions[from].includes(to)) {
          invalidPairs.push([from, to]);
        }
      }
    }

    it.each(invalidPairs)('should reject transition from %s to %s', async (from, to) => {
      mockPrismaService.order.findUnique.mockResolvedValue({ id: 'order-1', status: from });

      await expect(service.updateStatus('order-1', { status: to })).rejects.toThrow(
        BadRequestException,
      );
      expect(mockPrismaService.$transaction).not.toHaveBeenCalled();
    });
  });

  // --- Cobertura del cuerpo real de las transacciones ($transaction) ---
  // Las suites anteriores mockean $transaction como jest.fn() sin invocar nunca el
  // callback, así que la lógica de negocio más crítica (creación de items, descuento
  // de inventario, historial, limpieza de carrito, devolución de stock al cancelar)
  // nunca se ejecutaba bajo test. Aquí se mockea $transaction para que SÍ invoque el
  // callback con un cliente transaccional simulado, ejercitando ese código real.
  describe('create - cuerpo de la transacción', () => {
    const validPayload = {
      customerName: 'Test User',
      customerPhone: '3001234567',
      deliveryAddress: 'Calle Falsa 123, Bogotá',
    };

    function buildCart() {
      return {
        id: 'cart-1',
        items: [
          {
            productId: 'product-1',
            quantity: 2,
            price: 5000,
            product: {
              name: 'Cookie',
              isActive: true,
              inventory: { id: 'inv-1', stockAvailable: 10, stockReserved: 2 },
            },
          },
          {
            productId: 'product-2',
            quantity: 1,
            price: 3000,
            product: {
              name: 'Brownie',
              isActive: true,
              inventory: { id: 'inv-2', stockAvailable: 5, stockReserved: 1 },
            },
          },
        ],
      };
    }

    function buildTxClient() {
      return {
        order: { create: jest.fn().mockResolvedValue({ id: 'new-order-1' }) },
        coupon: { update: jest.fn().mockResolvedValue({}) },
        orderItem: { create: jest.fn().mockResolvedValue({}) },
        inventory: { update: jest.fn().mockResolvedValue({}) },
        inventoryMovement: { create: jest.fn().mockResolvedValue({}) },
        orderStatusHistory: { create: jest.fn().mockResolvedValue({}) },
        cartItem: { deleteMany: jest.fn().mockResolvedValue({}) },
        cart: { delete: jest.fn().mockResolvedValue({}) },
      };
    }

    it('creates the order, its items, decrements inventory, logs movements, and clears the cart (no coupon)', async () => {
      const cart = buildCart();
      mockPrismaService.cart.findFirst.mockResolvedValue(cart);
      const tx = buildTxClient();
      mockPrismaService.$transaction.mockImplementation((cb) => cb(tx));
      mockPrismaService.order.findUnique.mockResolvedValue({ id: 'new-order-1', items: [] });

      await service.create('session-123', validPayload);

      // subtotal = 2*5000 + 1*3000 = 13000, sin cupón
      expect(tx.order.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            subtotal: 13000,
            tax: 13000 * 0.19,
            discount: 0,
            couponCode: undefined,
            status: OrderStatus.PENDING,
          }),
        }),
      );
      expect(tx.coupon.update).not.toHaveBeenCalled();

      // Un orderItem + un movimiento de inventario por cada line item del carrito.
      expect(tx.orderItem.create).toHaveBeenCalledTimes(2);
      expect(tx.inventoryMovement.create).toHaveBeenCalledTimes(2);

      expect(tx.inventory.update).toHaveBeenCalledWith({
        where: { productId: 'product-1' },
        data: { stockReserved: { decrement: 2 }, stockAvailable: { decrement: 2 } },
      });
      expect(tx.inventory.update).toHaveBeenCalledWith({
        where: { productId: 'product-2' },
        data: { stockReserved: { decrement: 1 }, stockAvailable: { decrement: 1 } },
      });

      expect(tx.orderStatusHistory.create).toHaveBeenCalledWith({
        data: { orderId: 'new-order-1', toStatus: OrderStatus.PENDING, notes: 'Orden creada' },
      });

      expect(tx.cartItem.deleteMany).toHaveBeenCalledWith({ where: { cartId: 'cart-1' } });
      expect(tx.cart.delete).toHaveBeenCalledWith({ where: { id: 'cart-1' } });

      // create() retorna el resultado de findOne(order.id), no el objeto crudo de la transacción.
      expect(mockPrismaService.order.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'new-order-1' } }),
      );
    });

    it('applies subtotal/discount/total correctly and increments coupon usedCount when a valid coupon is used', async () => {
      const cart = buildCart(); // subtotal 13000
      mockPrismaService.cart.findFirst.mockResolvedValue(cart);
      mockCouponsService.validate.mockResolvedValue({
        coupon: { id: 'coupon-1', code: 'DESC10' },
        discount: 1300, // 10% de 13000
      });
      const tx = buildTxClient();
      mockPrismaService.$transaction.mockImplementation((cb) => cb(tx));
      mockPrismaService.order.findUnique.mockResolvedValue({ id: 'new-order-1', items: [] });

      await service.create('session-123', { ...validPayload, couponCode: ' desc10 ' });

      // El código se normaliza a mayúsculas y sin espacios antes de validar.
      expect(mockCouponsService.validate).toHaveBeenCalledWith('DESC10', 13000);

      const tax = 13000 * 0.19;
      expect(tx.order.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            subtotal: 13000,
            tax,
            discount: 1300,
            couponCode: 'DESC10',
            total: 13000 + tax - 1300,
          }),
        }),
      );
      expect(tx.coupon.update).toHaveBeenCalledWith({
        where: { id: 'coupon-1' },
        data: { usedCount: { increment: 1 } },
      });
    });

    it('falls back customerEmail to the default sentinel when not provided', async () => {
      const cart = buildCart();
      mockPrismaService.cart.findFirst.mockResolvedValue(cart);
      const tx = buildTxClient();
      mockPrismaService.$transaction.mockImplementation((cb) => cb(tx));
      mockPrismaService.order.findUnique.mockResolvedValue({ id: 'new-order-1', items: [] });

      await service.create('session-123', validPayload);

      expect(tx.order.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ customerEmail: 'sin-email@default.com' }),
        }),
      );
    });
  });

  describe('updateStatus - cuerpo de la transacción', () => {
    function buildTxClient(items: Array<{ productId: string; quantity: number }>) {
      return {
        order: {
          update: jest
            .fn()
            .mockResolvedValue({ id: 'order-1', status: OrderStatus.CANCELLED, items }),
        },
        orderStatusHistory: { create: jest.fn().mockResolvedValue({}) },
        inventory: { update: jest.fn().mockResolvedValue({ id: 'inv-1' }) },
        inventoryMovement: { create: jest.fn().mockResolvedValue({}) },
      };
    }

    it('records status history without touching inventory for a normal (non-cancel) transition', async () => {
      mockPrismaService.order.findUnique.mockResolvedValue({
        id: 'order-1',
        status: OrderStatus.PENDING,
      });
      const tx = buildTxClient([]);
      tx.order.update.mockResolvedValue({
        id: 'order-1',
        status: OrderStatus.CONFIRMED,
        items: [],
      });
      mockPrismaService.$transaction.mockImplementation((cb) => cb(tx));

      const result = await service.updateStatus('order-1', {
        status: OrderStatus.CONFIRMED,
        note: 'Confirmado por admin',
      });

      expect(tx.order.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'order-1' },
          data: { status: OrderStatus.CONFIRMED },
        }),
      );
      expect(tx.orderStatusHistory.create).toHaveBeenCalledWith({
        data: {
          orderId: 'order-1',
          fromStatus: OrderStatus.PENDING,
          toStatus: OrderStatus.CONFIRMED,
          notes: 'Confirmado por admin',
        },
      });
      expect(tx.inventory.update).not.toHaveBeenCalled();
      expect(tx.inventoryMovement.create).not.toHaveBeenCalled();
      expect(result.status).toBe(OrderStatus.CONFIRMED);
    });

    it('returns stock to inventory and logs an IN movement per item when cancelling', async () => {
      mockPrismaService.order.findUnique.mockResolvedValue({
        id: 'order-1',
        status: OrderStatus.CONFIRMED,
      });
      const items = [
        { productId: 'product-1', quantity: 2 },
        { productId: 'product-2', quantity: 3 },
      ];
      const tx = buildTxClient(items);
      mockPrismaService.$transaction.mockImplementation((cb) => cb(tx));

      await service.updateStatus('order-1', { status: OrderStatus.CANCELLED });

      expect(tx.inventory.update).toHaveBeenCalledTimes(2);
      expect(tx.inventory.update).toHaveBeenCalledWith({
        where: { productId: 'product-1' },
        data: { stockAvailable: { increment: 2 } },
        select: { id: true },
      });
      expect(tx.inventory.update).toHaveBeenCalledWith({
        where: { productId: 'product-2' },
        data: { stockAvailable: { increment: 3 } },
        select: { id: true },
      });
      expect(tx.inventoryMovement.create).toHaveBeenCalledTimes(2);
      expect(tx.inventoryMovement.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          inventoryId: 'inv-1',
          type: 'IN',
          quantity: 2,
          orderId: 'order-1',
        }),
      });
    });

    it('does not touch inventory when cancelling an order with zero items', async () => {
      mockPrismaService.order.findUnique.mockResolvedValue({
        id: 'order-1',
        status: OrderStatus.PENDING,
      });
      const tx = buildTxClient([]);
      mockPrismaService.$transaction.mockImplementation((cb) => cb(tx));

      await service.updateStatus('order-1', { status: OrderStatus.CANCELLED });

      expect(tx.inventory.update).not.toHaveBeenCalled();
      expect(tx.inventoryMovement.create).not.toHaveBeenCalled();
    });
  });

  describe('findByOrderNumberAndPhone', () => {
    it('returns the order (via findOne) when orderNumber and phone match', async () => {
      mockPrismaService.order.findUnique
        .mockResolvedValueOnce({ id: 'order-1', orderNumber: 'ORD-1', customerPhone: '3001234567' }) // findUnique dentro de findByOrderNumberAndPhone
        .mockResolvedValueOnce({ id: 'order-1', items: [] }); // findUnique dentro de findOne()

      const result = await service.findByOrderNumberAndPhone({
        orderNumber: ' ORD-1 ',
        customerPhone: '3001234567',
      });

      expect(mockPrismaService.order.findUnique).toHaveBeenNthCalledWith(1, {
        where: { orderNumber: 'ORD-1' },
      });
      expect(result).toEqual({ id: 'order-1', items: [] });
    });

    it('throws NotFoundException (generic message) when the orderNumber does not exist', async () => {
      mockPrismaService.order.findUnique.mockResolvedValue(null);

      await expect(
        service.findByOrderNumberAndPhone({
          orderNumber: 'ORD-DOES-NOT-EXIST',
          customerPhone: '3001234567',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws the same generic NotFoundException when the phone does not match (no user enumeration)', async () => {
      mockPrismaService.order.findUnique.mockResolvedValue({
        id: 'order-1',
        orderNumber: 'ORD-1',
        customerPhone: '3009999999',
      });

      await expect(
        service.findByOrderNumberAndPhone({ orderNumber: 'ORD-1', customerPhone: '3001234567' }),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
