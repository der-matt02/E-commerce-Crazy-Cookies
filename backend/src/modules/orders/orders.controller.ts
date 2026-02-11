import { Controller, Get, Post, Patch, Body, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { OrderStatus } from '@prisma/client';

@ApiTags('orders')
@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  @ApiOperation({ summary: 'Crear orden desde carrito' })
  @ApiQuery({ name: 'sessionId', required: true, description: 'ID de sesión del carrito' })
  @ApiResponse({ status: 201, description: 'Orden creada' })
  @ApiResponse({ status: 400, description: 'Carrito vacío o stock insuficiente' })
  create(@Query('sessionId') sessionId: string, @Body() dto: CreateOrderDto) {
    return this.ordersService.create(sessionId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Listar todas las órdenes' })
  @ApiResponse({ status: 200, description: 'Lista de órdenes' })
  findAll() {
    return this.ordersService.findAll();
  }

  @Get('status/:status')
  @ApiOperation({ summary: 'Listar órdenes por estado' })
  @ApiResponse({ status: 200, description: 'Órdenes filtradas' })
  getByStatus(@Param('status') status: OrderStatus) {
    return this.ordersService.getByStatus(status);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener detalle de una orden' })
  @ApiResponse({ status: 200, description: 'Orden encontrada' })
  @ApiResponse({ status: 404, description: 'Orden no encontrada' })
  findOne(@Param('id') id: string) {
    return this.ordersService.findOne(id);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Actualizar estado de una orden' })
  @ApiResponse({ status: 200, description: 'Estado actualizado' })
  @ApiResponse({ status: 400, description: 'Transición de estado inválida' })
  @ApiResponse({ status: 404, description: 'Orden no encontrada' })
  updateStatus(@Param('id') id: string, @Body() dto: UpdateOrderStatusDto) {
    return this.ordersService.updateStatus(id, dto);
  }
}
