import { Test, TestingModule } from '@nestjs/testing';
import { CartService } from './cart.service';
import { PrismaService } from '../../database/prisma.service';
import { NotFoundException, BadRequestException } from '@nestjs/common';

describe('CartService', () => {
  let service: CartService;
  let prisma: PrismaService;

  const mockPrismaService = {
    cart: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
    },
    cartItem: {
      findFirst: jest.fn(),
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
    prisma = module.get<PrismaService>(PrismaService);

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

      await expect(
        service.removeCartItem('session-123', 'invalid-id'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('clearCart', () => {
    it('should throw error when cart not found', async () => {
      mockPrismaService.cart.findFirst.mockResolvedValue(null);

      await expect(service.clearCart('session-123')).rejects.toThrow(
        NotFoundException,
      );
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

    it('should return null when cart not found', async () => {
      mockPrismaService.cart.findFirst.mockResolvedValue(null);

      const result = await service.getCart('session-123');

      expect(result).toBeNull();
    });
  });
});
