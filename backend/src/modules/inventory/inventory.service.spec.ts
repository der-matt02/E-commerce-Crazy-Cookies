import { Test, TestingModule } from '@nestjs/testing';
import { InventoryService } from './inventory.service';
import { PrismaService } from '../../database/prisma.service';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { AdjustmentDirection, AdjustmentType } from './dto/adjust-inventory.dto';

describe('InventoryService', () => {
  let service: InventoryService;

  const mockPrismaService = {
    inventory: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      fields: {
        stockMinimum: 'stockMinimum',
        stockAvailable: 'stockAvailable',
      },
    },
    inventoryMovement: {
      findMany: jest.fn(),
      create: jest.fn(),
    },
    $transaction: jest.fn(),
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

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getAll', () => {
    it('should return all inventories', async () => {
      const mockInventories = [
        {
          id: 'inv-1',
          productId: 'prod-1',
          stockAvailable: 100,
          stockReserved: 5,
          stockMinimum: 10,
          product: { name: 'Product 1' },
        },
        {
          id: 'inv-2',
          productId: 'prod-2',
          stockAvailable: 50,
          stockReserved: 0,
          stockMinimum: 5,
          product: { name: 'Product 2' },
        },
      ];

      mockPrismaService.inventory.findMany.mockResolvedValue(mockInventories);

      const result = await service.getAll();

      expect(result).toEqual(mockInventories);
      expect(mockPrismaService.inventory.findMany).toHaveBeenCalled();
    });
  });

  describe('getOne', () => {
    it('should return inventory by productId', async () => {
      const productId = 'prod-1';
      const mockInventory = {
        id: 'inv-1',
        productId,
        stockAvailable: 100,
        stockReserved: 5,
        stockMinimum: 10,
        product: { name: 'Product 1', category: { name: 'Category 1' } },
      };

      mockPrismaService.inventory.findUnique.mockResolvedValue(mockInventory);

      const result = await service.getOne(productId);

      expect(result).toEqual(mockInventory);
      expect(mockPrismaService.inventory.findUnique).toHaveBeenCalledWith({
        where: { productId },
        include: {
          product: {
            include: { category: true },
          },
        },
      });
    });

    it('should throw NotFoundException when inventory not found', async () => {
      mockPrismaService.inventory.findUnique.mockResolvedValue(null);

      await expect(service.getOne('invalid-id')).rejects.toThrow(NotFoundException);
    });
  });

  describe('getMovements', () => {
    it('should return movements for a product', async () => {
      const productId = 'prod-1';
      const mockInventory = { id: 'inv-1', productId };
      const mockMovements = [
        { id: 'mov-1', type: 'IN', quantity: 50, reason: 'Restock' },
        { id: 'mov-2', type: 'OUT', quantity: 10, reason: 'Sale' },
      ];

      mockPrismaService.inventory.findUnique.mockResolvedValue(mockInventory);
      mockPrismaService.inventoryMovement.findMany.mockResolvedValue(mockMovements);

      const result = await service.getMovements(productId);

      expect(result).toEqual(mockMovements);
    });

    it('should throw NotFoundException when product inventory not found', async () => {
      mockPrismaService.inventory.findUnique.mockResolvedValue(null);

      await expect(service.getMovements('invalid-id')).rejects.toThrow(NotFoundException);
    });
  });

  describe('adjustStock', () => {
    it('should throw NotFoundException when inventory not found', async () => {
      mockPrismaService.inventory.findUnique.mockResolvedValue(null);

      await expect(
        service.adjustStock('invalid-id', { type: AdjustmentType.IN, quantity: 10 }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getLowStockProducts', () => {
    it('should return products with low stock', async () => {
      const mockLowStockItems = [
        {
          id: 'inv-1',
          productId: 'prod-1',
          stockAvailable: 3,
          stockMinimum: 10,
          product: { name: 'Product 1' },
        },
      ];

      mockPrismaService.inventory.findMany.mockResolvedValue(mockLowStockItems);

      const result = await service.getLowStockProducts();

      expect(result).toEqual(mockLowStockItems);
    });
  });

  describe('getStockAlerts', () => {
    it('should return structured stock alerts with lowStock and highReserved', async () => {
      const mockLowStock = [
        {
          id: 'inv-1',
          productId: 'prod-1',
          stockAvailable: 2,
          stockReserved: 0,
          stockMinimum: 10,
          product: { name: 'Product 1' },
        },
      ];
      const mockHighReserved = [
        {
          id: 'inv-2',
          productId: 'prod-2',
          stockAvailable: 4,
          stockReserved: 6,
          stockMinimum: 5,
          product: { name: 'Product 2' },
        },
      ];

      mockPrismaService.inventory.findMany
        .mockResolvedValueOnce(mockLowStock)
        .mockResolvedValueOnce(mockHighReserved);

      const result = await service.getStockAlerts();

      expect(result).toHaveProperty('lowStock');
      expect(result).toHaveProperty('highReserved');
      expect(result.lowStock).toHaveLength(1);
      expect(result.lowStock[0]).toMatchObject({
        productId: 'prod-1',
        productName: 'Product 1',
        stockAvailable: 2,
        stockMinimum: 10,
        deficit: 8,
      });
      expect(result.highReserved).toHaveLength(1);
      expect(result.highReserved[0]).toMatchObject({
        productId: 'prod-2',
        productName: 'Product 2',
      });
    });
  });

  // --- Casos límite y adversariales agregados ---

  describe('adjustStock - casos adversariales', () => {
    it('should throw BadRequestException when an OUT adjustment would leave stock negative', async () => {
      mockPrismaService.inventory.findUnique.mockResolvedValue({
        id: 'inv-1',
        productId: 'prod-1',
        stockAvailable: 5,
        stockReserved: 0,
      });

      await expect(
        service.adjustStock('prod-1', { type: AdjustmentType.OUT, quantity: 10 }),
      ).rejects.toThrow(BadRequestException);
      expect(mockPrismaService.$transaction).not.toHaveBeenCalled();
    });

    it('should allow an OUT adjustment that leaves stock exactly at zero (boundary)', async () => {
      mockPrismaService.inventory.findUnique.mockResolvedValue({
        id: 'inv-1',
        productId: 'prod-1',
        stockAvailable: 10,
        stockReserved: 0,
      });
      mockPrismaService.$transaction.mockImplementation(
        (fn: (p: typeof mockPrismaService) => Promise<unknown>) => fn(mockPrismaService),
      );
      mockPrismaService.inventory.update.mockResolvedValue({
        id: 'inv-1',
        productId: 'prod-1',
        stockAvailable: 0,
      });

      const result = await service.adjustStock('prod-1', {
        type: AdjustmentType.OUT,
        quantity: 10,
      });

      expect(result.stockAvailable).toBe(0);
      expect(mockPrismaService.inventory.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { stockAvailable: { increment: -10 } } }),
      );
    });

    it('FIX: ADJUSTMENT with direction=DECREASE reduces stock, correcting an over-count', async () => {
      mockPrismaService.inventory.findUnique.mockResolvedValue({
        id: 'inv-1',
        productId: 'prod-1',
        stockAvailable: 10,
        stockReserved: 0,
      });
      mockPrismaService.$transaction.mockImplementation(
        (fn: (p: typeof mockPrismaService) => Promise<unknown>) => fn(mockPrismaService),
      );
      mockPrismaService.inventory.update.mockResolvedValue({
        id: 'inv-1',
        productId: 'prod-1',
        stockAvailable: 5,
      });

      const result = await service.adjustStock('prod-1', {
        type: AdjustmentType.ADJUSTMENT,
        quantity: 5,
        direction: AdjustmentDirection.DECREASE,
      });

      expect(mockPrismaService.inventory.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { stockAvailable: { increment: -5 } } }),
      );
      expect(result.stockAvailable).toBe(5);
    });

    it('FIX: ADJUSTMENT without an explicit direction still defaults to increasing stock (backwards compatible)', async () => {
      mockPrismaService.inventory.findUnique.mockResolvedValue({
        id: 'inv-1',
        productId: 'prod-1',
        stockAvailable: 10,
        stockReserved: 0,
      });
      mockPrismaService.$transaction.mockImplementation(
        (fn: (p: typeof mockPrismaService) => Promise<unknown>) => fn(mockPrismaService),
      );
      mockPrismaService.inventory.update.mockResolvedValue({
        id: 'inv-1',
        productId: 'prod-1',
        stockAvailable: 15,
      });

      await service.adjustStock('prod-1', { type: AdjustmentType.ADJUSTMENT, quantity: 5 });

      expect(mockPrismaService.inventory.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { stockAvailable: { increment: 5 } } }),
      );
    });

    it('FIX: an ADJUSTMENT-DECREASE that would leave stock negative is rejected, same as OUT', async () => {
      mockPrismaService.inventory.findUnique.mockResolvedValue({
        id: 'inv-1',
        productId: 'prod-1',
        stockAvailable: 3,
        stockReserved: 0,
      });

      await expect(
        service.adjustStock('prod-1', {
          type: AdjustmentType.ADJUSTMENT,
          quantity: 5,
          direction: AdjustmentDirection.DECREASE,
        }),
      ).rejects.toThrow(BadRequestException);
      expect(mockPrismaService.$transaction).not.toHaveBeenCalled();
    });

    it('FIX: an unhandled/invalid adjustment type is rejected instead of silently no-oping (switch now has a default branch)', async () => {
      mockPrismaService.inventory.findUnique.mockResolvedValue({
        id: 'inv-1',
        productId: 'prod-1',
        stockAvailable: 10,
        stockReserved: 0,
      });

      await expect(
        service.adjustStock('prod-1', {
          type: 'BOGUS_TYPE' as unknown as AdjustmentType,
          quantity: 5,
        }),
      ).rejects.toThrow(BadRequestException);
      expect(mockPrismaService.$transaction).not.toHaveBeenCalled();
    });

    it('FIX: uses an atomic Prisma increment instead of a pre-computed absolute value, avoiding lost updates under concurrent adjustments', async () => {
      mockPrismaService.inventory.findUnique.mockResolvedValue({
        id: 'inv-1',
        productId: 'prod-1',
        stockAvailable: 20,
        stockReserved: 0,
      });
      mockPrismaService.$transaction.mockImplementation(
        (fn: (p: typeof mockPrismaService) => Promise<unknown>) => fn(mockPrismaService),
      );
      mockPrismaService.inventory.update.mockResolvedValue({
        id: 'inv-1',
        productId: 'prod-1',
        stockAvailable: 25,
      });

      await service.adjustStock('prod-1', { type: AdjustmentType.IN, quantity: 5 });

      // { increment: 5 } deja que MySQL calcule stockAvailable = stockAvailable + 5 en una
      // sola sentencia atómica: dos ajustes concurrentes ya no pueden pisarse.
      expect(mockPrismaService.inventory.update).toHaveBeenCalledWith({
        where: { productId: 'prod-1' },
        data: { stockAvailable: { increment: 5 } },
        include: { product: { include: { category: true } } },
      });
    });
  });
});
