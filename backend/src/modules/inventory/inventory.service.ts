import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { AdjustInventoryDto, AdjustmentType } from './dto/adjust-inventory.dto';
import { InventoryMovementType } from '@prisma/client';

@Injectable()
export class InventoryService {
  constructor(private prisma: PrismaService) {}

  async getAll() {
    const inventories = await this.prisma.inventory.findMany({
      include: {
        product: {
          include: {
            category: true,
          },
        },
      },
      orderBy: {
        product: {
          createdAt: 'desc',
        },
      },
    });

    return inventories;
  }

  async getOne(productId: string) {
    const inventory = await this.prisma.inventory.findUnique({
      where: { productId },
      include: {
        product: {
          include: {
            category: true,
          },
        },
      },
    });

    if (!inventory) {
      throw new NotFoundException('Inventario no encontrado');
    }

    return inventory;
  }

  async getMovements(productId: string) {
    // Verificar que el inventario existe
    const inventory = await this.prisma.inventory.findUnique({
      where: { productId },
    });

    if (!inventory) {
      throw new NotFoundException('Inventario no encontrado');
    }

    const movements = await this.prisma.inventoryMovement.findMany({
      where: { inventoryId: inventory.id },
      orderBy: { createdAt: 'desc' },
      take: 50, // Últimos 50 movimientos
    });

    return movements;
  }

  async adjustStock(productId: string, dto: AdjustInventoryDto) {
    const inventory = await this.prisma.inventory.findUnique({
      where: { productId },
    });

    if (!inventory) {
      throw new NotFoundException('Inventario no encontrado');
    }

    // Validar que no se quede en negativo
    if (dto.type === AdjustmentType.OUT && inventory.stockAvailable < dto.quantity) {
      throw new BadRequestException(
        `Stock insuficiente. Disponible: ${inventory.stockAvailable}, Solicitado: ${dto.quantity}`,
      );
    }

    // Mapear tipo de ajuste a tipo de movimiento
    let movementType: InventoryMovementType;
    let newStockAvailable = inventory.stockAvailable;

    switch (dto.type) {
      case AdjustmentType.IN:
        movementType = InventoryMovementType.IN;
        newStockAvailable += dto.quantity;
        break;
      case AdjustmentType.OUT:
        movementType = InventoryMovementType.OUT;
        newStockAvailable -= dto.quantity;
        break;
      case AdjustmentType.ADJUSTMENT:
        movementType = InventoryMovementType.ADJUSTMENT;
        // Para ajustes, la cantidad puede ser positiva o negativa
        // pero el DTO solo acepta positivos, así que asumimos que es un incremento
        newStockAvailable += dto.quantity;
        break;
    }

    // Transacción para actualizar inventario y crear movimiento
    const result = await this.prisma.$transaction(async (prisma) => {
      // Actualizar inventario
      const updatedInventory = await prisma.inventory.update({
        where: { productId },
        data: { stockAvailable: newStockAvailable },
        include: {
          product: {
            include: {
              category: true,
            },
          },
        },
      });

      // Crear movimiento
      await prisma.inventoryMovement.create({
        data: {
          inventoryId: inventory.id,
          type: movementType,
          quantity: dto.quantity,
          reason: dto.reason || `Ajuste manual: ${dto.type}`,
        },
      });

      return updatedInventory;
    });

    return result;
  }

  async getLowStockProducts() {
    const lowStockInventories = await this.prisma.inventory.findMany({
      where: {
        stockAvailable: {
          lte: this.prisma.inventory.fields.stockMinimum,
        },
      },
      include: {
        product: {
          include: {
            category: true,
          },
        },
      },
      orderBy: {
        stockAvailable: 'asc',
      },
    });

    return lowStockInventories;
  }

  async getStockAlerts() {
    // Productos con stock por debajo del mínimo
    const lowStock = await this.prisma.inventory.findMany({
      where: {
        stockAvailable: {
          lte: this.prisma.inventory.fields.stockMinimum,
        },
      },
      include: {
        product: true,
      },
    });

    // Productos con mucho stock reservado (>50% del disponible)
    const highReserved = await this.prisma.inventory.findMany({
      where: {
        stockReserved: {
          gte: this.prisma.inventory.fields.stockAvailable,
        },
      },
      include: {
        product: true,
      },
    });

    return {
      lowStock: lowStock.map((inv) => ({
        productId: inv.productId,
        productName: inv.product.name,
        stockAvailable: inv.stockAvailable,
        stockMinimum: inv.stockMinimum,
        deficit: inv.stockMinimum - inv.stockAvailable,
      })),
      highReserved: highReserved.map((inv) => ({
        productId: inv.productId,
        productName: inv.product.name,
        stockAvailable: inv.stockAvailable,
        stockReserved: inv.stockReserved,
        reservedPercentage: Math.round((inv.stockReserved / (inv.stockAvailable + inv.stockReserved)) * 100),
      })),
    };
  }
}
