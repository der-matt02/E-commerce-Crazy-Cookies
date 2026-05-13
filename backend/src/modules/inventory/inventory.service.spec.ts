import { Test, TestingModule } from '@nestjs/testing';
import { InventoryService } from './inventory.service';
import { PrismaService } from '../../database/prisma.service';
import { NotFoundException } from '@nestjs/common';
import { AdjustmentType } from './dto/adjust-inventory.dto';

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
});
