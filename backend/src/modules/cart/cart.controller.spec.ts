import { Test, TestingModule } from '@nestjs/testing';
import { CartController } from './cart.controller';
import { CartService } from './cart.service';
import { AddToCartDto } from './dto/add-to-cart.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';
import { NotFoundException, BadRequestException } from '@nestjs/common';

describe('CartController', () => {
  let controller: CartController;

  const mockCartService = {
    getCart: jest.fn(),
    addToCart: jest.fn(),
    updateCartItem: jest.fn(),
    removeCartItem: jest.fn(),
    clearCart: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CartController],
      providers: [
        {
          provide: CartService,
          useValue: mockCartService,
        },
      ],
    }).compile();

    controller = module.get<CartController>(CartController);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  // Nota: CartController no aplica @UseGuards en ningún endpoint (es de acceso público),
  // por lo que no hay guards que verificar en este controller.

  describe('getCart', () => {
    it('should delegate to CartService.getCart with the sessionId query param', async () => {
      const mockCart = { id: 'cart-1', items: [] };
      mockCartService.getCart.mockResolvedValue(mockCart);

      const result = await controller.getCart('session-123');

      expect(mockCartService.getCart).toHaveBeenCalledWith('session-123');
      expect(mockCartService.getCart).toHaveBeenCalledTimes(1);
      expect(result).toEqual(mockCart);
    });

    it('should pass through undefined when sessionId query param is absent', async () => {
      mockCartService.getCart.mockResolvedValue(null);

      await controller.getCart(undefined as unknown as string);

      expect(mockCartService.getCart).toHaveBeenCalledWith(undefined);
    });

    it('should propagate errors thrown by the service without swallowing them', async () => {
      mockCartService.getCart.mockRejectedValue(new NotFoundException('Cart not found'));

      await expect(controller.getCart('missing-session')).rejects.toThrow(NotFoundException);
    });
  });

  describe('addToCart', () => {
    it('should delegate to CartService.addToCart with sessionId and dto', async () => {
      const dto: AddToCartDto = { productId: 'prod-1', quantity: 2 };
      const mockCart = { id: 'cart-1', items: [{ productId: 'prod-1', quantity: 2 }] };
      mockCartService.addToCart.mockResolvedValue(mockCart);

      const result = await controller.addToCart('session-123', dto);

      expect(mockCartService.addToCart).toHaveBeenCalledWith('session-123', dto);
      expect(result).toEqual(mockCart);
    });

    it('should propagate BadRequestException from the service (e.g. insufficient stock)', async () => {
      const dto: AddToCartDto = { productId: 'prod-1', quantity: 999 };
      mockCartService.addToCart.mockRejectedValue(new BadRequestException('Stock insuficiente'));

      await expect(controller.addToCart('session-123', dto)).rejects.toThrow(BadRequestException);
    });

    it('should propagate NotFoundException when product does not exist', async () => {
      const dto: AddToCartDto = { productId: 'non-existent', quantity: 1 };
      mockCartService.addToCart.mockRejectedValue(new NotFoundException('Producto no encontrado'));

      await expect(controller.addToCart('session-123', dto)).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateCartItem', () => {
    it('should delegate to CartService.updateCartItem with sessionId, itemId and dto', async () => {
      const dto: UpdateCartItemDto = { quantity: 5 };
      const mockCart = { id: 'cart-1', items: [{ id: 'item-1', quantity: 5 }] };
      mockCartService.updateCartItem.mockResolvedValue(mockCart);

      const result = await controller.updateCartItem('session-123', 'item-1', dto);

      expect(mockCartService.updateCartItem).toHaveBeenCalledWith('session-123', 'item-1', dto);
      expect(result).toEqual(mockCart);
    });

    it('should propagate NotFoundException when the item does not exist', async () => {
      const dto: UpdateCartItemDto = { quantity: 1 };
      mockCartService.updateCartItem.mockRejectedValue(new NotFoundException('Item no encontrado'));

      await expect(
        controller.updateCartItem('session-123', 'malformed-id-###', dto),
      ).rejects.toThrow(NotFoundException);
      expect(mockCartService.updateCartItem).toHaveBeenCalledWith(
        'session-123',
        'malformed-id-###',
        dto,
      );
    });
  });

  describe('removeCartItem', () => {
    it('should delegate to CartService.removeCartItem with sessionId and itemId', async () => {
      mockCartService.removeCartItem.mockResolvedValue({ id: 'cart-1', items: [] });

      await controller.removeCartItem('session-123', 'item-1');

      expect(mockCartService.removeCartItem).toHaveBeenCalledWith('session-123', 'item-1');
    });

    it('should propagate NotFoundException from the service', async () => {
      mockCartService.removeCartItem.mockRejectedValue(new NotFoundException('Item no encontrado'));

      await expect(controller.removeCartItem('session-123', 'unknown-item')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('clearCart', () => {
    it('should delegate to CartService.clearCart with the sessionId', async () => {
      mockCartService.clearCart.mockResolvedValue({ id: 'cart-1', items: [] });

      await controller.clearCart('session-123');

      expect(mockCartService.clearCart).toHaveBeenCalledWith('session-123');
    });

    it('should propagate errors thrown by the service', async () => {
      mockCartService.clearCart.mockRejectedValue(new Error('database unreachable'));

      await expect(controller.clearCart('session-123')).rejects.toThrow('database unreachable');
    });
  });
});
