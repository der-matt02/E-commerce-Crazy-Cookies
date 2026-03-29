import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { AddToCartDto } from './dto/add-to-cart.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';
import { InventoryMovementType } from '@prisma/client';

@Injectable()
export class CartService {
  constructor(private prisma: PrismaService) {}

  private readonly cartInclude = {
    items: {
      include: {
        product: {
          include: {
            category: true,
            inventory: true,
          },
        },
      },
    },
  } as const;

  private async fetchCartById(cartId: string) {
    return this.prisma.cart.findUnique({
      where: { id: cartId },
      include: this.cartInclude,
    });
  }

  async getOrCreateCart(sessionId: string) {
    // Buscar carrito activo (no expirado)
    let cart = await this.prisma.cart.findFirst({
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
                category: true,
                inventory: true,
              },
            },
          },
        },
      },
    });

    // Si no existe o expiró, crear uno nuevo
    if (!cart) {
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 24); // TTL 24 horas

      cart = await this.prisma.cart.create({
        data: {
          sessionId,
          expiresAt,
        },
        include: {
          items: {
            include: {
              product: {
                include: {
                  category: true,
                  inventory: true,
                },
              },
            },
          },
        },
      });
    }

    return cart;
  }

  async addToCart(sessionId: string, dto: AddToCartDto) {
    // Obtener o crear carrito
    const cart = await this.getOrCreateCart(sessionId);

    // Verificar que el producto existe y está activo
    const product = await this.prisma.product.findUnique({
      where: { id: dto.productId },
      include: { inventory: true },
    });

    if (!product) {
      throw new NotFoundException('Producto no encontrado');
    }

    if (!product.isActive) {
      throw new BadRequestException('El producto no está disponible');
    }

    if (!product.inventory) {
      throw new BadRequestException('El producto no tiene inventario');
    }

    // Verificar stock disponible
    const availableStock = product.inventory.stockAvailable - product.inventory.stockReserved;

    // Verificar si ya existe el producto en el carrito
    const existingItem = await this.prisma.cartItem.findFirst({
      where: {
        cartId: cart.id,
        productId: dto.productId,
      },
    });

    const totalQuantityNeeded = existingItem
      ? existingItem.quantity + dto.quantity
      : dto.quantity;

    if (availableStock < dto.quantity) {
      throw new BadRequestException(
        `Stock insuficiente. Disponible: ${availableStock}, Solicitado: ${dto.quantity}`,
      );
    }

    // Transacción para agregar al carrito y reservar stock
    await this.prisma.$transaction(async (prisma) => {
      // Si ya existe, actualizar cantidad
      if (existingItem) {
        await prisma.cartItem.update({
          where: { id: existingItem.id },
          data: { quantity: totalQuantityNeeded },
        });

        // Reservar stock adicional
        await prisma.inventory.update({
          where: { productId: dto.productId },
          data: { stockReserved: { increment: dto.quantity } },
        });

        // Crear movimiento de inventario
        await prisma.inventoryMovement.create({
          data: {
            inventoryId: product.inventory!.id,
            type: InventoryMovementType.RESERVED,
            quantity: dto.quantity,
            reason: `Reservado por carrito: ${cart.sessionId}`,
          },
        });
      } else {
        // Crear nuevo item
        await prisma.cartItem.create({
          data: {
            cartId: cart.id,
            productId: dto.productId,
            quantity: dto.quantity,
            price: product.price,
          },
        });

        // Reservar stock
        await prisma.inventory.update({
          where: { productId: dto.productId },
          data: { stockReserved: { increment: dto.quantity } },
        });

        // Crear movimiento de inventario
        await prisma.inventoryMovement.create({
          data: {
            inventoryId: product.inventory!.id,
            type: InventoryMovementType.RESERVED,
            quantity: dto.quantity,
            reason: `Reservado por carrito: ${cart.sessionId}`,
          },
        });
      }
    });

    // Retornar carrito actualizado
    return this.fetchCartById(cart.id);
  }

  async updateCartItem(sessionId: string, itemId: string, dto: UpdateCartItemDto) {
    const cart = await this.getOrCreateCart(sessionId);

    const item = await this.prisma.cartItem.findFirst({
      where: {
        id: itemId,
        cartId: cart.id,
      },
      include: {
        product: {
          include: {
            inventory: true,
          },
        },
      },
    });

    if (!item) {
      throw new NotFoundException('Item no encontrado en el carrito');
    }

    const quantityDiff = dto.quantity - item.quantity;

    // Si aumenta la cantidad, verificar stock
    if (quantityDiff > 0) {
      const availableStock =
        item.product.inventory!.stockAvailable - item.product.inventory!.stockReserved;

      if (availableStock < quantityDiff) {
        throw new BadRequestException(
          `Stock insuficiente. Disponible: ${availableStock}, Solicitado: ${quantityDiff}`,
        );
      }
    }

    // Transacción para actualizar cantidad y ajustar stock reservado
    await this.prisma.$transaction(async (prisma) => {
      // Actualizar item
      await prisma.cartItem.update({
        where: { id: itemId },
        data: { quantity: dto.quantity },
      });

      // Ajustar stock reservado
      await prisma.inventory.update({
        where: { productId: item.productId },
        data: { stockReserved: { increment: quantityDiff } },
      });

      // Crear movimiento de inventario
      const movementType =
        quantityDiff > 0 ? InventoryMovementType.RESERVED : InventoryMovementType.RELEASED;

      await prisma.inventoryMovement.create({
        data: {
          inventoryId: item.product.inventory!.id,
          type: movementType,
          quantity: Math.abs(quantityDiff),
          reason: `Ajuste de carrito: ${cart.sessionId}`,
        },
      });
    });

    return this.fetchCartById(cart.id);
  }

  async removeCartItem(sessionId: string, itemId: string) {
    const cart = await this.getOrCreateCart(sessionId);

    const item = await this.prisma.cartItem.findFirst({
      where: {
        id: itemId,
        cartId: cart.id,
      },
      include: {
        product: {
          include: {
            inventory: true,
          },
        },
      },
    });

    if (!item) {
      throw new NotFoundException('Item no encontrado en el carrito');
    }

    // Transacción para eliminar item y liberar stock
    await this.prisma.$transaction(async (prisma) => {
      // Eliminar item
      await prisma.cartItem.delete({
        where: { id: itemId },
      });

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
          inventoryId: item.product.inventory!.id,
          type: InventoryMovementType.RELEASED,
          quantity: item.quantity,
          reason: `Liberado por eliminación de carrito: ${cart.sessionId}`,
        },
      });
    });

    return this.fetchCartById(cart.id);
  }

  async clearCart(sessionId: string) {
    const cart = await this.getOrCreateCart(sessionId);

    // Obtener todos los items
    const items = await this.prisma.cartItem.findMany({
      where: { cartId: cart.id },
      include: {
        product: {
          include: {
            inventory: true,
          },
        },
      },
    });

    // Transacción para eliminar items y liberar stock
    await this.prisma.$transaction(async (prisma) => {
      for (const item of items) {
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
            inventoryId: item.product.inventory!.id,
            type: InventoryMovementType.RELEASED,
            quantity: item.quantity,
            reason: `Liberado por vaciado de carrito: ${cart.sessionId}`,
          },
        });
      }

      // Eliminar todos los items
      await prisma.cartItem.deleteMany({
        where: { cartId: cart.id },
      });
    });

    return this.fetchCartById(cart.id);
  }

  async getCart(sessionId: string) {
    return this.getOrCreateCart(sessionId);
  }
}
