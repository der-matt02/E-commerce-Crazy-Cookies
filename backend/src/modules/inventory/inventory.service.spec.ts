import { Test, TestingModule } from '@nestjs/testing';
import { InventoryService } from './inventory.service';
import { PrismaService } from '../../database/prisma.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';

describe('InventoryService', () => {
  let service: InventoryService;
  let prisma: PrismaService;

  const mockPrismaService = {
    inventory: {
      findUnique: jest.fn(),
      update: jest.fn(),
      create: jest.fn(),
    },
    inventoryMovement: {
      create: jest.fn(),
    },
    product: {
      findUnique: jest.fn(),
    },
    cart: {
      findMany: jest.fn(),
      delete: jest.fn(),
    },
    cartItem: {
      deleteMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InventoryService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<InventoryService>(InventoryService);
    prisma = module.get<PrismaService>(PrismaService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('reserveStock', () => {
    it('should reserve stock successfully when available', async () => {
      const productId = 'product-1';
      const quantity = 5;

      mockPrismaService.inventory.findUnique.mockResolvedValue({
        id: 'inv-1',
        productId,
        stockAvailable: 10,
        stockReserved: 0,
        stockMinimum: 2,
      });

      mockPrismaService.inventory.update.mockResolvedValue({
        id: 'inv-1',
        productId,
        stockAvailable: 10,
        stockReserved: 5,
        stockMinimum: 2,
      });

      mockPrismaService.inventoryMovement.create.mockResolvedValue({
        id: 'mov-1',
        productId,
        type: 'RESERVED',
        quantity,
        reason: 'Reserva de stock',
      });

      const result = await service.reserveStock(productId, quantity, 'Reserva de stock');

      expect(result).toBeDefined();
      expect(mockPrismaService.inventory.update).toHaveBeenCalledWith({
        where: { productId },
        data: { stockReserved: { increment: quantity } },
      });
      expect(mockPrismaService.inventoryMovement.create).toHaveBeenCalled();
    });

    it('should throw error when insufficient stock', async () => {
      const productId = 'product-1';
      const quantity = 15;

      mockPrismaService.inventory.findUnique.mockResolvedValue({
        id: 'inv-1',
        productId,
        stockAvailable: 10,
        stockReserved: 0,
        stockMinimum: 2,
      });

      await expect(
        service.reserveStock(productId, quantity, 'Test'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw error when inventory not found', async () => {
      mockPrismaService.inventory.findUnique.mockResolvedValue(null);

      await expect(
        service.reserveStock('invalid-id', 5, 'Test'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('releaseStock', () => {
    it('should release reserved stock successfully', async () => {
      const productId = 'product-1';
      const quantity = 5;

      mockPrismaService.inventory.findUnique.mockResolvedValue({
        id: 'inv-1',
        productId,
        stockAvailable: 10,
        stockReserved: 5,
        stockMinimum: 2,
      });

      mockPrismaService.inventory.update.mockResolvedValue({
        id: 'inv-1',
        productId,
        stockAvailable: 10,
        stockReserved: 0,
        stockMinimum: 2,
      });

      mockPrismaService.inventoryMovement.create.mockResolvedValue({
        id: 'mov-1',
        productId,
        type: 'RELEASED',
        quantity,
        reason: 'Liberación de stock',
      });

      const result = await service.releaseStock(productId, quantity, 'Liberación de stock');

      expect(result).toBeDefined();
      expect(mockPrismaService.inventory.update).toHaveBeenCalledWith({
        where: { productId },
        data: { stockReserved: { decrement: quantity } },
      });
    });
  });

  describe('checkStockAvailability', () => {
    it('should return true when stock is available', async () => {
      const productId = 'product-1';
      const quantity = 5;

      mockPrismaService.inventory.findUnique.mockResolvedValue({
        id: 'inv-1',
        productId,
        stockAvailable: 10,
        stockReserved: 0,
        stockMinimum: 2,
      });

      const result = await service.checkStockAvailability(productId, quantity);

      expect(result).toBe(true);
    });

    it('should return false when stock is insufficient', async () => {
      const productId = 'product-1';
      const quantity = 15;

      mockPrismaService.inventory.findUnique.mockResolvedValue({
        id: 'inv-1',
        productId,
        stockAvailable: 10,
        stockReserved: 0,
        stockMinimum: 2,
      });

      const result = await service.checkStockAvailability(productId, quantity);

      expect(result).toBe(false);
    });

    it('should throw error when inventory not found', async () => {
      mockPrismaService.inventory.findUnique.mockResolvedValue(null);

      await expect(
        service.checkStockAvailability('invalid-id', 5),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
