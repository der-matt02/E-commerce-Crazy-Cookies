import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AdminRole } from '@prisma/client';
import { InventoryService } from './inventory.service';
import { AdjustInventoryDto } from './dto/adjust-inventory.dto';
import { JwtAuthGuard } from '@modules/admin/guards/jwt-auth.guard';
import { RolesGuard } from '@modules/admin/guards/roles.guard';
import { Roles } from '@modules/admin/decorators/roles.decorator';

@ApiTags('inventory')
@ApiBearerAuth()
@Controller('inventory')
@UseGuards(JwtAuthGuard)
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Get()
  @ApiOperation({ summary: 'Obtener todos los inventarios' })
  @ApiResponse({ status: 200, description: 'Lista de inventarios' })
  getAll() {
    return this.inventoryService.getAll();
  }

  @Get('low-stock')
  @ApiOperation({ summary: 'Obtener productos con stock bajo' })
  @ApiResponse({ status: 200, description: 'Productos con stock bajo' })
  getLowStock() {
    return this.inventoryService.getLowStockProducts();
  }

  @Get('alerts')
  @ApiOperation({ summary: 'Obtener alertas de inventario' })
  @ApiResponse({ status: 200, description: 'Alertas de stock bajo y reservado' })
  getAlerts() {
    return this.inventoryService.getStockAlerts();
  }

  @Get(':productId')
  @ApiOperation({ summary: 'Obtener inventario de un producto' })
  @ApiResponse({ status: 200, description: 'Inventario del producto' })
  @ApiResponse({ status: 404, description: 'Inventario no encontrado' })
  getOne(@Param('productId') productId: string) {
    return this.inventoryService.getOne(productId);
  }

  @Get(':productId/movements')
  @ApiOperation({ summary: 'Obtener historial de movimientos de un producto' })
  @ApiResponse({ status: 200, description: 'Historial de movimientos' })
  @ApiResponse({ status: 404, description: 'Producto no encontrado' })
  getMovements(@Param('productId') productId: string) {
    return this.inventoryService.getMovements(productId);
  }

  @Post(':productId/adjust')
  @UseGuards(RolesGuard)
  @Roles(AdminRole.SUPER_ADMIN, AdminRole.ADMIN)
  @ApiOperation({ summary: 'Ajustar stock de un producto' })
  @ApiResponse({ status: 200, description: 'Stock ajustado exitosamente' })
  @ApiResponse({ status: 400, description: 'Datos inválidos o stock insuficiente' })
  @ApiResponse({ status: 404, description: 'Inventario no encontrado' })
  adjustStock(@Param('productId') productId: string, @Body() dto: AdjustInventoryDto) {
    return this.inventoryService.adjustStock(productId, dto);
  }
}
