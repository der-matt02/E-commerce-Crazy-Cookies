import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { JwtAuthGuard } from '@modules/admin/guards/jwt-auth.guard';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { LookupOrderDto } from './dto/lookup-order.dto';
import { OrderStatus } from '@prisma/client';
import { NotFoundException, BadRequestException } from '@nestjs/common';

describe('OrdersController', () => {
  let controller: OrdersController;

  const mockOrdersService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findByOrderNumberAndPhone: jest.fn(),
    getByStatus: jest.fn(),
    findOne: jest.fn(),
    updateStatus: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [OrdersController],
      providers: [
        {
          provide: OrdersService,
          useValue: mockOrdersService,
        },
        // JwtAuthGuard is used via @UseGuards() on some routes; Nest auto-registers it as an
        // injectable in the testing module, so its own dependency (ConfigService) must be
        // resolvable even though we never invoke the guard directly in these unit tests.
        {
          provide: ConfigService,
          useValue: { get: jest.fn() },
        },
      ],
    }).compile();

    controller = module.get<OrdersController>(OrdersController);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('guards', () => {
    it('should protect findAll with JwtAuthGuard', () => {
      const guards = Reflect.getMetadata('__guards__', OrdersController.prototype.findAll) || [];
      expect(guards).toContain(JwtAuthGuard);
    });

    it('should protect getByStatus with JwtAuthGuard', () => {
      const guards =
        Reflect.getMetadata('__guards__', OrdersController.prototype.getByStatus) || [];
      expect(guards).toContain(JwtAuthGuard);
    });

    it('should protect updateStatus with JwtAuthGuard', () => {
      const guards =
        Reflect.getMetadata('__guards__', OrdersController.prototype.updateStatus) || [];
      expect(guards).toContain(JwtAuthGuard);
    });

    it('should NOT protect create, lookup or findOne (public endpoints)', () => {
      expect(Reflect.getMetadata('__guards__', OrdersController.prototype.create)).toBeUndefined();
      expect(Reflect.getMetadata('__guards__', OrdersController.prototype.lookup)).toBeUndefined();
      expect(Reflect.getMetadata('__guards__', OrdersController.prototype.findOne)).toBeUndefined();
    });
  });

  describe('create', () => {
    it('should delegate to OrdersService.create with sessionId and dto', async () => {
      const dto: CreateOrderDto = {
        customerName: 'Juan Pérez',
        customerPhone: '3001234567',
        deliveryAddress: 'Calle 123 #45-67, Bogotá',
      };
      const mockOrder = { id: 'order-1', orderNumber: 'ORD-1' };
      mockOrdersService.create.mockResolvedValue(mockOrder);

      const result = await controller.create('session-123', dto);

      expect(mockOrdersService.create).toHaveBeenCalledWith('session-123', dto);
      expect(result).toEqual(mockOrder);
    });

    it('should propagate BadRequestException (e.g. empty cart) without swallowing it', async () => {
      const dto: CreateOrderDto = {
        customerName: 'Juan Pérez',
        customerPhone: '3001234567',
        deliveryAddress: 'Calle 123 #45-67, Bogotá',
      };
      mockOrdersService.create.mockRejectedValue(new BadRequestException('Carrito vacío'));

      await expect(controller.create('session-123', dto)).rejects.toThrow(BadRequestException);
    });
  });

  describe('findAll', () => {
    it('should delegate to OrdersService.findAll with page and limit', async () => {
      const mockResult = { data: [], total: 0, page: 1, limit: 20 };
      mockOrdersService.findAll.mockResolvedValue(mockResult);

      const result = await controller.findAll(1, 20);

      expect(mockOrdersService.findAll).toHaveBeenCalledWith(1, 20);
      expect(result).toEqual(mockResult);
    });

    it('should delegate with a custom page/limit combination', async () => {
      mockOrdersService.findAll.mockResolvedValue({ data: [], total: 0, page: 3, limit: 5 });

      await controller.findAll(3, 5);

      expect(mockOrdersService.findAll).toHaveBeenCalledWith(3, 5);
    });
  });

  describe('lookup', () => {
    it('should delegate to OrdersService.findByOrderNumberAndPhone with the dto', async () => {
      const dto: LookupOrderDto = {
        orderNumber: 'ORD-1234567890-AB12',
        customerPhone: '3001234567',
      };
      const mockOrder = { id: 'order-1', orderNumber: dto.orderNumber };
      mockOrdersService.findByOrderNumberAndPhone.mockResolvedValue(mockOrder);

      const result = await controller.lookup(dto);

      expect(mockOrdersService.findByOrderNumberAndPhone).toHaveBeenCalledWith(dto);
      expect(result).toEqual(mockOrder);
    });

    it('should propagate NotFoundException when the order is not found', async () => {
      const dto: LookupOrderDto = { orderNumber: 'ORD-NOPE', customerPhone: '3001234567' };
      mockOrdersService.findByOrderNumberAndPhone.mockRejectedValue(
        new NotFoundException('Orden no encontrada'),
      );

      await expect(controller.lookup(dto)).rejects.toThrow(NotFoundException);
    });
  });

  describe('getByStatus', () => {
    it('should delegate to OrdersService.getByStatus with the status param', async () => {
      mockOrdersService.getByStatus.mockResolvedValue([]);

      await controller.getByStatus(OrderStatus.PENDING);

      expect(mockOrdersService.getByStatus).toHaveBeenCalledWith(OrderStatus.PENDING);
    });

    it('should pass through a malformed/unknown status value as-is to the service', async () => {
      mockOrdersService.getByStatus.mockResolvedValue([]);

      await controller.getByStatus('NOT_A_REAL_STATUS' as OrderStatus);

      expect(mockOrdersService.getByStatus).toHaveBeenCalledWith('NOT_A_REAL_STATUS');
    });
  });

  describe('findOne', () => {
    it('should delegate to OrdersService.findOne with the id param', async () => {
      const mockOrder = { id: 'order-1' };
      mockOrdersService.findOne.mockResolvedValue(mockOrder);

      const result = await controller.findOne('order-1');

      expect(mockOrdersService.findOne).toHaveBeenCalledWith('order-1');
      expect(result).toEqual(mockOrder);
    });

    it('should propagate NotFoundException for a malformed id', async () => {
      mockOrdersService.findOne.mockRejectedValue(new NotFoundException('Orden no encontrada'));

      await expect(controller.findOne('not-a-valid-id')).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateStatus', () => {
    it('should delegate to OrdersService.updateStatus with id and dto', async () => {
      const dto: UpdateOrderStatusDto = { status: OrderStatus.CONFIRMED };
      const mockOrder = { id: 'order-1', status: OrderStatus.CONFIRMED };
      mockOrdersService.updateStatus.mockResolvedValue(mockOrder);

      const result = await controller.updateStatus('order-1', dto);

      expect(mockOrdersService.updateStatus).toHaveBeenCalledWith('order-1', dto);
      expect(result).toEqual(mockOrder);
    });

    it('should propagate BadRequestException for an invalid status transition', async () => {
      const dto: UpdateOrderStatusDto = { status: OrderStatus.DELIVERED };
      mockOrdersService.updateStatus.mockRejectedValue(
        new BadRequestException('Transición de estado inválida'),
      );

      await expect(controller.updateStatus('order-1', dto)).rejects.toThrow(BadRequestException);
    });

    it('should propagate NotFoundException when the order does not exist', async () => {
      const dto: UpdateOrderStatusDto = { status: OrderStatus.CONFIRMED };
      mockOrdersService.updateStatus.mockRejectedValue(
        new NotFoundException('Orden no encontrada'),
      );

      await expect(controller.updateStatus('unknown-id', dto)).rejects.toThrow(NotFoundException);
    });
  });
});
