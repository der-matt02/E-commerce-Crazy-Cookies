import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { InventoryController } from './inventory.controller';
import { InventoryService } from './inventory.service';
import { JwtAuthGuard } from '@modules/admin/guards/jwt-auth.guard';
import { AdjustInventoryDto, AdjustmentType } from './dto/adjust-inventory.dto';
import { NotFoundException, BadRequestException } from '@nestjs/common';

describe('InventoryController', () => {
  let controller: InventoryController;

  const mockInventoryService = {
    getAll: jest.fn(),
    getLowStockProducts: jest.fn(),
    getStockAlerts: jest.fn(),
    getOne: jest.fn(),
    getMovements: jest.fn(),
    adjustStock: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [InventoryController],
      providers: [
        {
          provide: InventoryService,
          useValue: mockInventoryService,
        },
        // JwtAuthGuard is used via a class-level @UseGuards(); Nest auto-registers it as an
        // injectable in the testing module, so its own dependency (ConfigService) must be
        // resolvable even though we never invoke the guard directly in these unit tests.
        {
          provide: ConfigService,
          useValue: { get: jest.fn() },
        },
      ],
    }).compile();

    controller = module.get<InventoryController>(InventoryController);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('guards', () => {
    it('should protect the whole controller with JwtAuthGuard (class-level @UseGuards)', () => {
      const guards = Reflect.getMetadata('__guards__', InventoryController) || [];
      expect(guards).toContain(JwtAuthGuard);
    });
  });

  describe('getAll', () => {
    it('should delegate to InventoryService.getAll', async () => {
      const mockInventories = [{ productId: 'p1', stock: 10 }];
      mockInventoryService.getAll.mockResolvedValue(mockInventories);

      const result = await controller.getAll();

      expect(mockInventoryService.getAll).toHaveBeenCalledTimes(1);
      expect(result).toEqual(mockInventories);
    });

    it('should propagate errors thrown by the service without swallowing them', async () => {
      mockInventoryService.getAll.mockRejectedValue(new Error('database unreachable'));

      await expect(controller.getAll()).rejects.toThrow('database unreachable');
    });
  });

  describe('getLowStock', () => {
    it('should delegate to InventoryService.getLowStockProducts', async () => {
      const mockProducts = [{ productId: 'p1', stock: 1 }];
      mockInventoryService.getLowStockProducts.mockResolvedValue(mockProducts);

      const result = await controller.getLowStock();

      expect(mockInventoryService.getLowStockProducts).toHaveBeenCalledTimes(1);
      expect(result).toEqual(mockProducts);
    });
  });

  describe('getAlerts', () => {
    it('should delegate to InventoryService.getStockAlerts', async () => {
      const mockAlerts = { lowStock: [], reserved: [] };
      mockInventoryService.getStockAlerts.mockResolvedValue(mockAlerts);

      const result = await controller.getAlerts();

      expect(mockInventoryService.getStockAlerts).toHaveBeenCalledTimes(1);
      expect(result).toEqual(mockAlerts);
    });
  });

  describe('getOne', () => {
    it('should delegate to InventoryService.getOne with productId', async () => {
      const mockInventory = { productId: 'product-1', stock: 20 };
      mockInventoryService.getOne.mockResolvedValue(mockInventory);

      const result = await controller.getOne('product-1');

      expect(mockInventoryService.getOne).toHaveBeenCalledWith('product-1');
      expect(result).toEqual(mockInventory);
    });

    it('should propagate NotFoundException for a malformed/unknown productId', async () => {
      mockInventoryService.getOne.mockRejectedValue(
        new NotFoundException('Inventario no encontrado'),
      );

      await expect(controller.getOne('###not-a-real-id###')).rejects.toThrow(NotFoundException);
    });
  });

  describe('getMovements', () => {
    it('should delegate to InventoryService.getMovements with productId', async () => {
      const mockMovements = [{ id: 'mov-1', type: 'IN', quantity: 5 }];
      mockInventoryService.getMovements.mockResolvedValue(mockMovements);

      const result = await controller.getMovements('product-1');

      expect(mockInventoryService.getMovements).toHaveBeenCalledWith('product-1');
      expect(result).toEqual(mockMovements);
    });

    it('should propagate NotFoundException when the product does not exist', async () => {
      mockInventoryService.getMovements.mockRejectedValue(
        new NotFoundException('Producto no encontrado'),
      );

      await expect(controller.getMovements('unknown-product')).rejects.toThrow(NotFoundException);
    });
  });

  describe('adjustStock', () => {
    it('should delegate to InventoryService.adjustStock with productId and dto', async () => {
      const dto: AdjustInventoryDto = {
        quantity: 10,
        type: AdjustmentType.IN,
        reason: 'Entrada de mercancía',
      };
      const mockResult = { productId: 'product-1', stock: 30 };
      mockInventoryService.adjustStock.mockResolvedValue(mockResult);

      const result = await controller.adjustStock('product-1', dto);

      expect(mockInventoryService.adjustStock).toHaveBeenCalledWith('product-1', dto);
      expect(result).toEqual(mockResult);
    });

    it('should propagate BadRequestException for insufficient stock on OUT adjustments', async () => {
      const dto: AdjustInventoryDto = { quantity: 999, type: AdjustmentType.OUT };
      mockInventoryService.adjustStock.mockRejectedValue(
        new BadRequestException('Stock insuficiente'),
      );

      await expect(controller.adjustStock('product-1', dto)).rejects.toThrow(BadRequestException);
    });

    it('should propagate NotFoundException when the inventory does not exist', async () => {
      const dto: AdjustInventoryDto = { quantity: 5, type: AdjustmentType.ADJUSTMENT };
      mockInventoryService.adjustStock.mockRejectedValue(
        new NotFoundException('Inventario no encontrado'),
      );

      await expect(controller.adjustStock('unknown-product', dto)).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
