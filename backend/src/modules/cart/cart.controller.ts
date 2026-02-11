import { Controller, Get, Post, Patch, Delete, Body, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { CartService } from './cart.service';
import { AddToCartDto } from './dto/add-to-cart.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';

@ApiTags('cart')
@Controller('cart')
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @Get()
  @ApiOperation({ summary: 'Obtener carrito por sessionId' })
  @ApiQuery({ name: 'sessionId', required: true, description: 'ID de sesión del carrito' })
  @ApiResponse({ status: 200, description: 'Carrito obtenido' })
  getCart(@Query('sessionId') sessionId: string) {
    return this.cartService.getCart(sessionId);
  }

  @Post()
  @ApiOperation({ summary: 'Agregar producto al carrito' })
  @ApiQuery({ name: 'sessionId', required: true, description: 'ID de sesión del carrito' })
  @ApiResponse({ status: 201, description: 'Producto agregado al carrito' })
  @ApiResponse({ status: 400, description: 'Stock insuficiente o producto inactivo' })
  @ApiResponse({ status: 404, description: 'Producto no encontrado' })
  addToCart(@Query('sessionId') sessionId: string, @Body() dto: AddToCartDto) {
    return this.cartService.addToCart(sessionId, dto);
  }

  @Patch('items/:itemId')
  @ApiOperation({ summary: 'Actualizar cantidad de un item en el carrito' })
  @ApiQuery({ name: 'sessionId', required: true, description: 'ID de sesión del carrito' })
  @ApiResponse({ status: 200, description: 'Item actualizado' })
  @ApiResponse({ status: 400, description: 'Stock insuficiente' })
  @ApiResponse({ status: 404, description: 'Item no encontrado' })
  updateCartItem(
    @Query('sessionId') sessionId: string,
    @Param('itemId') itemId: string,
    @Body() dto: UpdateCartItemDto,
  ) {
    return this.cartService.updateCartItem(sessionId, itemId, dto);
  }

  @Delete('items/:itemId')
  @ApiOperation({ summary: 'Eliminar item del carrito' })
  @ApiQuery({ name: 'sessionId', required: true, description: 'ID de sesión del carrito' })
  @ApiResponse({ status: 200, description: 'Item eliminado' })
  @ApiResponse({ status: 404, description: 'Item no encontrado' })
  removeCartItem(@Query('sessionId') sessionId: string, @Param('itemId') itemId: string) {
    return this.cartService.removeCartItem(sessionId, itemId);
  }

  @Delete()
  @ApiOperation({ summary: 'Vaciar carrito' })
  @ApiQuery({ name: 'sessionId', required: true, description: 'ID de sesión del carrito' })
  @ApiResponse({ status: 200, description: 'Carrito vaciado' })
  clearCart(@Query('sessionId') sessionId: string) {
    return this.cartService.clearCart(sessionId);
  }
}
