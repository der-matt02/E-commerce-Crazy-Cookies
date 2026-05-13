import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { OrderStatus, InventoryMovementType } from '@prisma/client';

@Injectable()
export class OrdersService {
  constructor(private prisma: PrismaService) {}

  async create(sessionId: string, dto: CreateOrderDto) {
    // Obtener carrito
    const cart = await this.prisma.cart.findFirst({
      where: {
        sessionId,
        expiresAt: {
          gt: new Date(),
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

    if (!cart || cart.items.length === 0) {
      throw new BadRequestException('El carrito está vacío');
    }

    // Validar que todos los productos sigan activos y tengan stock
    for (const item of cart.items) {
      if (!item.product.isActive) {
        throw new BadRequestException(`El producto ${item.product.name} ya no está disponible`);
      }

      const availableStock =
        item.product.inventory!.stockAvailable - item.product.inventory!.stockReserved;

      if (availableStock < item.quantity) {
        throw new BadRequestException(`Stock insuficiente para ${item.product.name}`);
      }
    }

    // Calcular totales
    const subtotal = cart.items.reduce((sum, item) => sum + Number(item.price) * item.quantity, 0);
    const tax = subtotal * 0.19; // IVA 19%
    const total = subtotal + tax;

    // Crear orden en transacción
    const order = await this.prisma.$transaction(async (prisma) => {
      // Generar orderNumber único
      const orderNumber = `ORD-${Date.now()}`;

      // Crear orden
      const newOrder = await prisma.order.create({
        data: {
          orderNumber,
          customerName: dto.customerName,
          customerPhone: dto.customerPhone,
          customerEmail: dto.customerEmail || 'sin-email@default.com',
          shippingAddress: dto.deliveryAddress,
          shippingCity: 'Bogotá', // Default, se puede mejorar extrayendo de la dirección
          shippingNotes: dto.notes,
          status: OrderStatus.PENDING,
          subtotal,
          tax,
          total,
        },
      });

      // Crear items de la orden
      for (const cartItem of cart.items) {
        await prisma.orderItem.create({
          data: {
            orderId: newOrder.id,
            productId: cartItem.productId,
            quantity: cartItem.quantity,
            price: cartItem.price,
          },
        });

        // Actualizar inventario: liberar reservado y reducir disponible
        await prisma.inventory.update({
          where: { productId: cartItem.productId },
          data: {
            stockReserved: {
              decrement: cartItem.quantity,
            },
            stockAvailable: {
              decrement: cartItem.quantity,
            },
          },
        });

        // Crear movimiento de inventario
        await prisma.inventoryMovement.create({
          data: {
            inventoryId: cartItem.product.inventory!.id,
            type: InventoryMovementType.OUT,
            quantity: cartItem.quantity,
            reason: `Venta - Orden #${newOrder.id}`,
            orderId: newOrder.id,
          },
        });
      }

      // Crear historial de estado inicial
      await prisma.orderStatusHistory.create({
        data: {
          orderId: newOrder.id,
          toStatus: OrderStatus.PENDING,
          notes: 'Orden creada',
        },
      });

      // Eliminar items del carrito
      await prisma.cartItem.deleteMany({
        where: { cartId: cart.id },
      });

      // Eliminar carrito
      await prisma.cart.delete({
        where: { id: cart.id },
      });

      return newOrder;
    });

    // Retornar orden con items
    return this.findOne(order.id);
  }

  async findAll() {
    return this.prisma.order.findMany({
      include: {
        items: {
          include: {
            product: {
              include: {
                category: true,
              },
            },
          },
        },
        statusHistory: {
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findOne(id: string) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            product: {
              include: {
                category: true,
              },
            },
          },
        },
        statusHistory: {
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
    });

    if (!order) {
      throw new NotFoundException('Orden no encontrada');
    }

    return order;
  }

  async updateStatus(id: string, dto: UpdateOrderStatusDto) {
    const order = await this.prisma.order.findUnique({
      where: { id },
    });

    if (!order) {
      throw new NotFoundException('Orden no encontrada');
    }

    // Validar transición de estado
    const validTransitions: Record<OrderStatus, OrderStatus[]> = {
      [OrderStatus.PENDING]: [OrderStatus.CONFIRMED, OrderStatus.CANCELLED],
      [OrderStatus.CONFIRMED]: [OrderStatus.IN_PROCESS, OrderStatus.CANCELLED],
      [OrderStatus.IN_PROCESS]: [OrderStatus.READY, OrderStatus.CANCELLED],
      [OrderStatus.READY]: [OrderStatus.DELIVERED, OrderStatus.CANCELLED],
      [OrderStatus.DELIVERED]: [],
      [OrderStatus.CANCELLED]: [],
    };

    if (!validTransitions[order.status].includes(dto.status)) {
      throw new BadRequestException(`No se puede cambiar de ${order.status} a ${dto.status}`);
    }

    // Actualizar en transacción
    const result = await this.prisma.$transaction(async (prisma) => {
      // Actualizar orden
      const updatedOrder = await prisma.order.update({
        where: { id },
        data: { status: dto.status },
        include: {
          items: {
            include: {
              product: {
                include: {
                  category: true,
                },
              },
            },
          },
          statusHistory: {
            orderBy: {
              createdAt: 'desc',
            },
          },
        },
      });

      // Crear historial
      await prisma.orderStatusHistory.create({
        data: {
          orderId: id,
          fromStatus: order.status,
          toStatus: dto.status,
          notes: dto.note,
        },
      });

      // Si se cancela, devolver stock
      if (dto.status === OrderStatus.CANCELLED) {
        for (const item of updatedOrder.items) {
          await prisma.inventory.update({
            where: { productId: item.productId },
            data: {
              stockAvailable: {
                increment: item.quantity,
              },
            },
          });

          // Crear movimiento de inventario
          const inventory = await prisma.inventory.findUnique({
            where: { productId: item.productId },
          });

          if (inventory) {
            await prisma.inventoryMovement.create({
              data: {
                inventoryId: inventory.id,
                type: InventoryMovementType.IN,
                quantity: item.quantity,
                reason: `Devolución por cancelación - Orden #${id}`,
                orderId: id,
              },
            });
          }
        }
      }

      return updatedOrder;
    });

    return result;
  }

  async getByStatus(status: OrderStatus) {
    return this.prisma.order.findMany({
      where: { status },
      include: {
        items: {
          include: {
            product: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }
}
