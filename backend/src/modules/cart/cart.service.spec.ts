import { Test, TestingModule } from '@nestjs/testing';
import { CartService } from './cart.service';
import { PrismaService } from '../../database/prisma.service';
import { InventoryService } from '../inventory/inventory.service';
import { NotFoundException, BadRequestException } from '@nestjs/common';

describe('CartService', () => {
  let service: CartService;
  let prisma: PrismaService;
  let inventoryService: InventoryService;

  const mockPrismaService = {
    cart: {
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
  };

  const mockInventoryService = {
    checkStockAvailability: jest.fn(),
    reserveStock: jest.fn(),
    releaseStock: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CartService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: InventoryService,
          useValue: mockInventoryService,
        },
      ],
    }).compile();

    service = module.get<CartService>(CartService);
    prisma = module.get<PrismaService>(PrismaService);
    inventoryService = module.get<InventoryService>(InventoryService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getCart', () => {
    it('should return existing cart', async () => {
      const sessionId = 'session-123';
      const mockCart = {
        id: 'cart-1',
        sessionId,
        items: [],
        expiresAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaService.cart.findUnique.mockResolvedValue(mockCart);

      const result = await service.getCart(sessionId);

      expect(result).toEqual(mockCart);
      expect(mockPrismaService.cart.findUnique).toHaveBeenCalledWith({
        where: { sessionId },
        include: {
          items: {
            include: {
              product: {
                include: { category: true, inventory: true },
              },
            },
          },
        },
      });
    });

    it('should create new cart if not exists', async () => {
      const sessionId = 'session-123';

      mockPrismaService.cart.findUnique.mockResolvedValue(null);
      mockPrismaService.cart.create.mockResolvedValue({
        id: 'cart-1',
        sessionId,
        items: [],
        expiresAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await service.getCart(sessionId);

      expect(result).toBeDefined();
      expect(mockPrismaService.cart.create).toHaveBeenCalled();
    });
  });

  describe('addItem', () => {
    it('should add new item to cart when product not in cart', async () => {
      const sessionId = 'session-123';
      const productId = 'product-1';
      const quantity = 2;
      const price = 10000;

      const mockProduct = {
        id: productId,
        name: 'Test Product',
        price,
        isActive: true,
      };

      const mockCart = {
        id: 'cart-1',
        sessionId,
        items: [],
      };

      mockPrismaService.product.findUnique.mockResolvedValue(mockProduct);
      mockInventoryService.checkStockAvailability.mockResolvedValue(true);
      mockPrismaService.cart.findUnique.mockResolvedValue(mockCart);
      mockPrismaService.cartItem.findFirst.mockResolvedValue(null);
      mockPrismaService.cartItem.create.mockResolvedValue({
        id: 'item-1',
        cartId: 'cart-1',
        productId,
        quantity,
        priceAtAdd: price,
      });
      mockInventoryService.reserveStock.mockResolvedValue({});

      await service.addItem(sessionId, { productId, quantity });

      expect(mockInventoryService.checkStockAvailability).toHaveBeenCalledWith(
        productId,
        quantity,
      );
      expect(mockInventoryService.reserveStock).toHaveBeenCalledWith(
        productId,
        quantity,
        expect.any(String),
      );
      expect(mockPrismaService.cartItem.create).toHaveBeenCalled();
    });

    it('should throw error when product not found', async () => {
      mockPrismaService.product.findUnique.mockResolvedValue(null);

      await expect(
        service.addItem('session-123', { productId: 'invalid', quantity: 1 }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw error when product is inactive', async () => {
      mockPrismaService.product.findUnique.mockResolvedValue({
        id: 'product-1',
        isActive: false,
      });

      await expect(
        service.addItem('session-123', { productId: 'product-1', quantity: 1 }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw error when insufficient stock', async () => {
      mockPrismaService.product.findUnique.mockResolvedValue({
        id: 'product-1',
        isActive: true,
        price: 10000,
      });
      mockInventoryService.checkStockAvailability.mockResolvedValue(false);

      await expect(
        service.addItem('session-123', { productId: 'product-1', quantity: 100 }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('removeItem', () => {
    it('should remove item and release stock', async () => {
      const itemId = 'item-1';
      const quantity = 5;
      const productId = 'product-1';

      mockPrismaService.cartItem.findFirst.mockResolvedValue({
        id: itemId,
        quantity,
        productId,
      });
      mockPrismaService.cartItem.delete.mockResolvedValue({});
      mockInventoryService.releaseStock.mockResolvedValue({});

      await service.removeItem('session-123', itemId);

      expect(mockInventoryService.releaseStock).toHaveBeenCalledWith(
        productId,
        quantity,
        expect.any(String),
      );
      expect(mockPrismaService.cartItem.delete).toHaveBeenCalledWith({
        where: { id: itemId },
      });
    });

    it('should throw error when item not found', async () => {
      mockPrismaService.cartItem.findFirst.mockResolvedValue(null);

      await expect(
        service.removeItem('session-123', 'invalid-id'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('clearCart', () => {
    it('should clear all items and release stock', async () => {
      const sessionId = 'session-123';
      const mockCart = {
        id: 'cart-1',
        items: [
          { id: 'item-1', productId: 'product-1', quantity: 2 },
          { id: 'item-2', productId: 'product-2', quantity: 3 },
        ],
      };

      mockPrismaService.cart.findUnique.mockResolvedValue(mockCart);
      mockInventoryService.releaseStock.mockResolvedValue({});
      mockPrismaService.cartItem.deleteMany.mockResolvedValue({});

      await service.clearCart(sessionId);

      expect(mockInventoryService.releaseStock).toHaveBeenCalledTimes(2);
      expect(mockPrismaService.cartItem.deleteMany).toHaveBeenCalled();
    });
  });
});
