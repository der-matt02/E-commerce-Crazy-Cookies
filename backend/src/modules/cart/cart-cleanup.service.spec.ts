import { Test, TestingModule } from '@nestjs/testing';
import { CartCleanupService } from './cart-cleanup.service';
import { PrismaService } from '../../database/prisma.service';
import { InventoryMovementType } from '@prisma/client';

describe('CartCleanupService', () => {
  let service: CartCleanupService;

  const mockPrismaService = {
    cart: {
      findMany: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CartCleanupService, { provide: PrismaService, useValue: mockPrismaService }],
    }).compile();

    service = module.get<CartCleanupService>(CartCleanupService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  function buildTxClient() {
    return {
      inventory: { update: jest.fn().mockResolvedValue({}) },
      inventoryMovement: { create: jest.fn().mockResolvedValue({}) },
      cartItem: { deleteMany: jest.fn().mockResolvedValue({}) },
      cart: { delete: jest.fn().mockResolvedValue({}) },
    };
  }

  describe('cleanupExpiredCarts', () => {
    it('does nothing (no transaction started) when there are no expired carts', async () => {
      mockPrismaService.cart.findMany.mockResolvedValue([]);

      await service.cleanupExpiredCarts();

      expect(mockPrismaService.$transaction).not.toHaveBeenCalled();
    });

    it('releases reserved stock, logs a RELEASED movement, and deletes the cart for each expired cart', async () => {
      const cart = {
        id: 'cart-1',
        sessionId: 'session-1',
        items: [
          {
            productId: 'product-1',
            quantity: 3,
            product: { inventory: { id: 'inv-1' } },
          },
        ],
      };
      mockPrismaService.cart.findMany.mockResolvedValue([cart]);
      const tx = buildTxClient();
      mockPrismaService.$transaction.mockImplementation((cb) => cb(tx));

      await service.cleanupExpiredCarts();

      expect(mockPrismaService.cart.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { expiresAt: { lt: expect.any(Date) } } }),
      );
      expect(tx.inventory.update).toHaveBeenCalledWith({
        where: { productId: 'product-1' },
        data: { stockReserved: { decrement: 3 } },
      });
      expect(tx.inventoryMovement.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          inventoryId: 'inv-1',
          type: InventoryMovementType.RELEASED,
          quantity: 3,
        }),
      });
      expect(tx.cartItem.deleteMany).toHaveBeenCalledWith({ where: { cartId: 'cart-1' } });
      expect(tx.cart.delete).toHaveBeenCalledWith({ where: { id: 'cart-1' } });
    });

    it('skips stock release for items whose product has no inventory record, but still deletes the cart', async () => {
      const cart = {
        id: 'cart-1',
        sessionId: 'session-1',
        items: [{ productId: 'product-1', quantity: 1, product: { inventory: null } }],
      };
      mockPrismaService.cart.findMany.mockResolvedValue([cart]);
      const tx = buildTxClient();
      mockPrismaService.$transaction.mockImplementation((cb) => cb(tx));

      await service.cleanupExpiredCarts();

      expect(tx.inventory.update).not.toHaveBeenCalled();
      expect(tx.inventoryMovement.create).not.toHaveBeenCalled();
      expect(tx.cart.delete).toHaveBeenCalledWith({ where: { id: 'cart-1' } });
    });

    it('processes multiple expired carts independently, releasing stock for each', async () => {
      const carts = [
        {
          id: 'cart-1',
          sessionId: 'session-1',
          items: [{ productId: 'product-1', quantity: 2, product: { inventory: { id: 'inv-1' } } }],
        },
        {
          id: 'cart-2',
          sessionId: 'session-2',
          items: [{ productId: 'product-2', quantity: 5, product: { inventory: { id: 'inv-2' } } }],
        },
      ];
      mockPrismaService.cart.findMany.mockResolvedValue(carts);
      const txs = [buildTxClient(), buildTxClient()];
      let call = 0;
      mockPrismaService.$transaction.mockImplementation((cb) => cb(txs[call++]));

      await service.cleanupExpiredCarts();

      expect(mockPrismaService.$transaction).toHaveBeenCalledTimes(2);
      expect(txs[0].cart.delete).toHaveBeenCalledWith({ where: { id: 'cart-1' } });
      expect(txs[1].cart.delete).toHaveBeenCalledWith({ where: { id: 'cart-2' } });
    });

    it('keeps processing the remaining carts when one cart transaction fails', async () => {
      const carts = [
        {
          id: 'cart-1',
          sessionId: 'session-1',
          items: [{ productId: 'product-1', quantity: 1, product: { inventory: { id: 'inv-1' } } }],
        },
        {
          id: 'cart-2',
          sessionId: 'session-2',
          items: [{ productId: 'product-2', quantity: 1, product: { inventory: { id: 'inv-2' } } }],
        },
      ];
      mockPrismaService.cart.findMany.mockResolvedValue(carts);
      const secondTx = buildTxClient();
      mockPrismaService.$transaction
        .mockImplementationOnce(() => Promise.reject(new Error('DB timeout')))
        .mockImplementationOnce((cb) => cb(secondTx));

      await expect(service.cleanupExpiredCarts()).resolves.toBeUndefined();

      expect(mockPrismaService.$transaction).toHaveBeenCalledTimes(2);
      expect(secondTx.cart.delete).toHaveBeenCalledWith({ where: { id: 'cart-2' } });
    });

    it('swallows a top-level error (e.g. findMany failing) without throwing', async () => {
      mockPrismaService.cart.findMany.mockRejectedValue(new Error('DB connection lost'));

      await expect(service.cleanupExpiredCarts()).resolves.toBeUndefined();
      expect(mockPrismaService.$transaction).not.toHaveBeenCalled();
    });
  });
});
