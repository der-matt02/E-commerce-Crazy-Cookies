import { Test, TestingModule } from '@nestjs/testing';
import { CartService } from './cart.service';
import { PrismaService } from '../../database/prisma.service';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { InventoryMovementType } from '@prisma/client';

describe('CartService', () => {
  let service: CartService;

  const mockPrismaService = {
    cart: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
    },
    cartItem: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn(),
    },
    product: {
      findUnique: jest.fn(),
    },
    inventory: {
      findUnique: jest.fn(),
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
        CartService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<CartService>(CartService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getOrCreateCart', () => {
    it('should return existing cart', async () => {
      const sessionId = 'session-123';
      const mockCart = {
        id: 'cart-1',
        sessionId,
        items: [],
        expiresAt: new Date(Date.now() + 86400000),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaService.cart.findFirst.mockResolvedValue(mockCart);

      const result = await service.getOrCreateCart(sessionId);

      expect(result).toEqual(mockCart);
      expect(mockPrismaService.cart.findFirst).toHaveBeenCalled();
    });

    it('should create new cart if not exists', async () => {
      const sessionId = 'session-123';
      const mockNewCart = {
        id: 'cart-1',
        sessionId,
        items: [],
        expiresAt: new Date(Date.now() + 86400000),
      };

      mockPrismaService.cart.findFirst.mockResolvedValue(null);
      mockPrismaService.cart.create.mockResolvedValue(mockNewCart);

      const result = await service.getOrCreateCart(sessionId);

      expect(result).toBeDefined();
      expect(mockPrismaService.cart.create).toHaveBeenCalled();
    });
  });

  describe('addToCart', () => {
    it('should throw error when product not found', async () => {
      mockPrismaService.product.findUnique.mockResolvedValue(null);

      await expect(
        service.addToCart('session-123', { productId: 'invalid', quantity: 1 }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw error when product is inactive', async () => {
      mockPrismaService.product.findUnique.mockResolvedValue({
        id: 'product-1',
        isActive: false,
      });

      await expect(
        service.addToCart('session-123', { productId: 'product-1', quantity: 1 }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw error when insufficient stock', async () => {
      mockPrismaService.product.findUnique.mockResolvedValue({
        id: 'product-1',
        isActive: true,
        price: 10000,
        inventory: {
          stockAvailable: 5,
          stockReserved: 5,
        },
      });

      await expect(
        service.addToCart('session-123', { productId: 'product-1', quantity: 10 }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('removeCartItem', () => {
    it('should throw error when item not found', async () => {
      mockPrismaService.cart.findFirst.mockResolvedValue({
        id: 'cart-1',
        items: [],
      });

      await expect(service.removeCartItem('session-123', 'invalid-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('clearCart', () => {
    it('should create and return empty cart when none exists', async () => {
      const newCart = {
        id: 'cart-1',
        sessionId: 'session-123',
        items: [],
        expiresAt: new Date(Date.now() + 86400000),
      };

      mockPrismaService.cart.findFirst.mockResolvedValue(null);
      mockPrismaService.cart.create.mockResolvedValue(newCart);
      mockPrismaService.cart.findUnique.mockResolvedValue(newCart);
      mockPrismaService.cartItem.findMany.mockResolvedValue([]);
      mockPrismaService.$transaction.mockImplementation(
        (fn: (p: typeof mockPrismaService) => Promise<unknown>) => fn(mockPrismaService),
      );

      const result = await service.clearCart('session-123');

      expect(result).toBeDefined();
      expect(mockPrismaService.cart.create).toHaveBeenCalled();
    });
  });

  describe('getCart', () => {
    it('should return cart with items', async () => {
      const sessionId = 'session-123';
      const mockCart = {
        id: 'cart-1',
        sessionId,
        items: [
          {
            id: 'item-1',
            productId: 'product-1',
            quantity: 2,
            price: 10000,
            product: { name: 'Test Product' },
          },
        ],
      };

      mockPrismaService.cart.findFirst.mockResolvedValue(mockCart);

      const result = await service.getCart(sessionId);

      expect(result).toEqual(mockCart);
    });

    it('should create and return new cart when none exists', async () => {
      const newCart = {
        id: 'cart-new',
        sessionId: 'session-123',
        items: [],
        expiresAt: new Date(Date.now() + 86400000),
      };

      mockPrismaService.cart.findFirst.mockResolvedValue(null);
      mockPrismaService.cart.create.mockResolvedValue(newCart);

      const result = await service.getCart('session-123');

      expect(result).toBeDefined();
      expect(result).toEqual(newCart);
      expect(mockPrismaService.cart.create).toHaveBeenCalled();
    });
  });

  // --- Casos límite y adversariales agregados ---

  describe('getOrCreateCart - carrito expirado', () => {
    it('should query only non-expired carts (expiresAt > now) and create a brand-new cart when the existing one is expired', async () => {
      // La query real de Prisma filtra `expiresAt: { gt: new Date() }`, así que un carrito
      // expirado nunca es devuelto por findFirst; simulamos ese resultado con null.
      mockPrismaService.cart.findFirst.mockResolvedValue(null);
      const newCart = {
        id: 'cart-new',
        sessionId: 'session-123',
        items: [],
        expiresAt: new Date(Date.now() + 86400000),
      };
      mockPrismaService.cart.create.mockResolvedValue(newCart);

      const result = await service.getOrCreateCart('session-123');

      expect(result).toEqual(newCart);
      expect(mockPrismaService.cart.create).toHaveBeenCalled();
      const findFirstArgs = mockPrismaService.cart.findFirst.mock.calls[0][0];
      expect(findFirstArgs.where.expiresAt.gt).toBeInstanceOf(Date);
    });
  });

  describe('addToCart - casos adversariales', () => {
    it('should sum quantities (not create a second item) when adding the same product twice', async () => {
      const sessionId = 'session-123';
      mockPrismaService.cart.findFirst.mockResolvedValue({ id: 'cart-1', sessionId, items: [] });
      mockPrismaService.product.findUnique.mockResolvedValue({
        id: 'product-1',
        isActive: true,
        price: 5000,
        inventory: { id: 'inv-1', stockAvailable: 100, stockReserved: 0 },
      });
      mockPrismaService.cartItem.findFirst.mockResolvedValue({
        id: 'item-1',
        cartId: 'cart-1',
        productId: 'product-1',
        quantity: 3,
      });
      mockPrismaService.$transaction.mockImplementation(
        (fn: (p: typeof mockPrismaService) => Promise<unknown>) => fn(mockPrismaService),
      );
      mockPrismaService.cart.findUnique.mockResolvedValue({ id: 'cart-1', items: [] });

      await service.addToCart(sessionId, { productId: 'product-1', quantity: 2 });

      expect(mockPrismaService.cartItem.create).not.toHaveBeenCalled();
      expect(mockPrismaService.cartItem.update).toHaveBeenCalledWith({
        where: { id: 'item-1' },
        data: { quantity: 5 },
      });
      expect(mockPrismaService.inventory.update).toHaveBeenCalledWith({
        where: { productId: 'product-1' },
        data: { stockReserved: { increment: 2 } },
      });
    });

    it('should throw BadRequestException when the product has no inventory record', async () => {
      mockPrismaService.cart.findFirst.mockResolvedValue({
        id: 'cart-1',
        sessionId: 'session-123',
        items: [],
      });
      mockPrismaService.product.findUnique.mockResolvedValue({
        id: 'product-1',
        isActive: true,
        inventory: null,
      });

      await expect(
        service.addToCart('session-123', { productId: 'product-1', quantity: 1 }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject exactly at the stock boundary (requesting one more than available)', async () => {
      mockPrismaService.cart.findFirst.mockResolvedValue({
        id: 'cart-1',
        sessionId: 'session-123',
        items: [],
      });
      mockPrismaService.product.findUnique.mockResolvedValue({
        id: 'product-1',
        isActive: true,
        price: 1000,
        inventory: { id: 'inv-1', stockAvailable: 5, stockReserved: 0 }, // disponible = 5
      });
      mockPrismaService.cartItem.findFirst.mockResolvedValue(null);

      await expect(
        service.addToCart('session-123', { productId: 'product-1', quantity: 6 }),
      ).rejects.toThrow(BadRequestException);
    });

    it('FIX: rejects zero/negative quantity even when the service is called directly, without relying on the HTTP ValidationPipe', async () => {
      // AddToCartDto valida Min(1)/Max(99) vía class-validator, pero eso solo corre en el
      // ValidationPipe de HTTP. addToCart ahora re-valida la cantidad al inicio del método,
      // así que un caller interno futuro (cola, script) que la invoque directamente ya no
      // puede colar una cantidad negativa/cero ni "liberar" stock reservado por esta vía.
      await expect(
        service.addToCart('session-123', { productId: 'product-1', quantity: -5 }),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.addToCart('session-123', { productId: 'product-1', quantity: 0 }),
      ).rejects.toThrow(BadRequestException);

      expect(mockPrismaService.cart.findFirst).not.toHaveBeenCalled();
      expect(mockPrismaService.cartItem.create).not.toHaveBeenCalled();
    });

    it('FIX: rejects a quantity above the documented maximum (99) even when called directly', async () => {
      await expect(
        service.addToCart('session-123', { productId: 'product-1', quantity: 100 }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('updateCartItem - casos adversariales', () => {
    it('should throw NotFoundException when the item belongs to a different cart/session', async () => {
      mockPrismaService.cart.findFirst.mockResolvedValue({
        id: 'cart-mine',
        sessionId: 'session-A',
        items: [],
      });
      // El item existe en la BD pero no pertenece a cart-mine, así que la query con
      // cartId: cart.id no lo encuentra.
      mockPrismaService.cartItem.findFirst.mockResolvedValue(null);

      await expect(
        service.updateCartItem('session-A', 'item-de-otra-sesion', { quantity: 2 }),
      ).rejects.toThrow(NotFoundException);

      expect(mockPrismaService.cartItem.findFirst).toHaveBeenCalledWith({
        where: { id: 'item-de-otra-sesion', cartId: 'cart-mine' },
        include: { product: { include: { inventory: true } } },
      });
    });

    it('should throw BadRequestException when increasing quantity beyond available stock', async () => {
      mockPrismaService.cart.findFirst.mockResolvedValue({
        id: 'cart-1',
        sessionId: 'session-123',
        items: [],
      });
      mockPrismaService.cartItem.findFirst.mockResolvedValue({
        id: 'item-1',
        cartId: 'cart-1',
        productId: 'product-1',
        quantity: 2,
        product: { inventory: { stockAvailable: 5, stockReserved: 4 } }, // disponible real = 1
      });

      await expect(
        service.updateCartItem('session-123', 'item-1', { quantity: 10 }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should release stock (RELEASED movement) when decreasing quantity', async () => {
      mockPrismaService.cart.findFirst.mockResolvedValue({
        id: 'cart-1',
        sessionId: 'session-123',
        items: [],
      });
      mockPrismaService.cartItem.findFirst.mockResolvedValue({
        id: 'item-1',
        cartId: 'cart-1',
        productId: 'product-1',
        quantity: 5,
        product: { inventory: { id: 'inv-1', stockAvailable: 20, stockReserved: 5 } },
      });
      mockPrismaService.$transaction.mockImplementation(
        (fn: (p: typeof mockPrismaService) => Promise<unknown>) => fn(mockPrismaService),
      );
      mockPrismaService.cart.findUnique.mockResolvedValue({ id: 'cart-1', items: [] });

      await service.updateCartItem('session-123', 'item-1', { quantity: 2 });

      expect(mockPrismaService.inventory.update).toHaveBeenCalledWith({
        where: { productId: 'product-1' },
        data: { stockReserved: { increment: -3 } },
      });
      expect(mockPrismaService.inventoryMovement.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            type: InventoryMovementType.RELEASED,
            quantity: 3,
          }),
        }),
      );
    });
  });

  describe('removeCartItem - casos adicionales', () => {
    it('should throw NotFoundException when the item belongs to another session/cart', async () => {
      mockPrismaService.cart.findFirst.mockResolvedValue({
        id: 'cart-mine',
        sessionId: 'session-A',
        items: [],
      });
      mockPrismaService.cartItem.findFirst.mockResolvedValue(null);

      await expect(service.removeCartItem('session-A', 'item-de-otra-sesion')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should release reserved stock and create a RELEASED movement on success', async () => {
      mockPrismaService.cart.findFirst.mockResolvedValue({
        id: 'cart-1',
        sessionId: 'session-123',
        items: [],
      });
      mockPrismaService.cartItem.findFirst.mockResolvedValue({
        id: 'item-1',
        cartId: 'cart-1',
        productId: 'product-1',
        quantity: 4,
        product: { inventory: { id: 'inv-1' } },
      });
      mockPrismaService.$transaction.mockImplementation(
        (fn: (p: typeof mockPrismaService) => Promise<unknown>) => fn(mockPrismaService),
      );
      mockPrismaService.cart.findUnique.mockResolvedValue({ id: 'cart-1', items: [] });

      await service.removeCartItem('session-123', 'item-1');

      expect(mockPrismaService.cartItem.delete).toHaveBeenCalledWith({ where: { id: 'item-1' } });
      expect(mockPrismaService.inventory.update).toHaveBeenCalledWith({
        where: { productId: 'product-1' },
        data: { stockReserved: { decrement: 4 } },
      });
    });
  });
});
