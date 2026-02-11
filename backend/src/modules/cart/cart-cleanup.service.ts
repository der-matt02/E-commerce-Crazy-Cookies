import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../database/prisma.service';
import { InventoryMovementType } from '@prisma/client';

@Injectable()
export class CartCleanupService {
  private readonly logger = new Logger(CartCleanupService.name);

  constructor(private prisma: PrismaService) {}

  @Cron(CronExpression.EVERY_HOUR)
  async cleanupExpiredCarts() {
    this.logger.log('Iniciando limpieza de carritos expirados...');

    try {
      // Buscar carritos expirados
      const expiredCarts = await this.prisma.cart.findMany({
        where: {
          expiresAt: {
            lt: new Date(),
          },
        },
        include: {
          items: {
            include: {
              product: {
                include: {
                  inventory: true,
                },
              },
            },
          },
        },
      });

      if (expiredCarts.length === 0) {
        this.logger.log('No hay carritos expirados para limpiar');
        return;
      }

      this.logger.log(`Encontrados ${expiredCarts.length} carritos expirados`);

      let totalItemsReleased = 0;

      // Procesar cada carrito expirado
      for (const cart of expiredCarts) {
        try {
          await this.prisma.$transaction(async (prisma) => {
            // Liberar stock de cada item
            for (const item of cart.items) {
              if (item.product.inventory) {
                // Liberar stock reservado
                await prisma.inventory.update({
                  where: { productId: item.productId },
                  data: {
                    stockReserved: {
                      decrement: item.quantity,
                    },
                  },
                });

                // Crear movimiento de inventario
                await prisma.inventoryMovement.create({
                  data: {
                    inventoryId: item.product.inventory.id,
                    type: InventoryMovementType.RELEASED,
                    quantity: item.quantity,
                    reason: `Liberado por expiración de carrito: ${cart.sessionId}`,
                  },
                });

                totalItemsReleased++;
              }
            }

            // Eliminar items del carrito
            await prisma.cartItem.deleteMany({
              where: { cartId: cart.id },
            });

            // Eliminar carrito
            await prisma.cart.delete({
              where: { id: cart.id },
            });
          });

          this.logger.log(`Carrito ${cart.sessionId} limpiado exitosamente`);
        } catch (error) {
          this.logger.error(
            `Error limpiando carrito ${cart.sessionId}: ${(error as Error).message}`,
          );
        }
      }

      this.logger.log(
        `Limpieza completada. ${expiredCarts.length} carritos eliminados, ${totalItemsReleased} items liberados`,
      );
    } catch (error) {
      this.logger.error(`Error en limpieza de carritos: ${(error as Error).message}`);
    }
  }
}
