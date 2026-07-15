import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import {
  AdjustInventoryDto,
  AdjustmentDirection,
  AdjustmentType,
} from './dto/adjust-inventory.dto';
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

    // Mapear tipo de ajuste a tipo de movimiento y calcular el delta con signo.
    let movementType: InventoryMovementType;
    let stockDelta: number;

    switch (dto.type) {
      case AdjustmentType.IN:
        movementType = InventoryMovementType.IN;
        stockDelta = dto.quantity;
        break;
      case AdjustmentType.OUT:
        movementType = InventoryMovementType.OUT;
        stockDelta = -dto.quantity;
        break;
      case AdjustmentType.ADJUSTMENT:
        movementType = InventoryMovementType.ADJUSTMENT;
        // Un ajuste manual puede incrementar o reducir el stock (p.ej. para corregir
        // un sobre-conteo tras un conteo físico). El DTO solo acepta cantidades
        // positivas, así que la dirección la indica `direction`.
        stockDelta = dto.direction === AdjustmentDirection.DECREASE ? -dto.quantity : dto.quantity;
        break;
      default:
        throw new BadRequestException(`Tipo de ajuste no soportado: ${dto.type as string}`);
    }

    // Validar que no se quede en negativo (aplica a cualquier ajuste que reste stock)
    if (stockDelta < 0 && inventory.stockAvailable + stockDelta < 0) {
      throw new BadRequestException(
        `Stock insuficiente. Disponible: ${inventory.stockAvailable}, Solicitado: ${-stockDelta}`,
      );
    }

    // Transacción para actualizar inventario y crear movimiento. Se usa un increment
    // atómico de Prisma (en vez de leer-calcular-escribir un valor absoluto) para que
    // dos ajustes concurrentes sobre el mismo producto no se pisen (lost update).
    const result = await this.prisma.$transaction(async (prisma) => {
      const updatedInventory = await prisma.inventory.update({
        where: { productId },
        data: { stockAvailable: { increment: stockDelta } },
        include: {
          product: {
            include: {
              category: true,
            },
          },
        },
      });

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
        reservedPercentage: Math.round(
          (inv.stockReserved / (inv.stockAvailable + inv.stockReserved)) * 100,
        ),
      })),
    };
  }
}
