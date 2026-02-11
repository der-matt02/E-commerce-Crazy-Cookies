import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '@/database/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createProductDto: CreateProductDto) {
    const { stockAvailable, stockMinimum, ...productData } = createProductDto;

    // Check if slug already exists
    const existingSlug = await this.prisma.product.findUnique({
      where: { slug: createProductDto.slug },
    });

    if (existingSlug) {
      throw new ConflictException(`Product with slug "${createProductDto.slug}" already exists`);
    }

    // Check if category exists
    const category = await this.prisma.category.findUnique({
      where: { id: createProductDto.categoryId },
    });

    if (!category) {
      throw new NotFoundException(`Category with ID "${createProductDto.categoryId}" not found`);
    }

    // Create product with inventory
    return this.prisma.product.create({
      data: {
        ...productData,
        inventory: {
          create: {
            stockAvailable: stockAvailable ?? 0,
            stockReserved: 0,
            stockMinimum: stockMinimum ?? 5,
          },
        },
      },
      include: {
        category: true,
        inventory: true,
        images: true,
      },
    });
  }

  async findAll() {
    return this.prisma.product.findMany({
      include: {
        category: true,
        inventory: true,
        images: {
          orderBy: { order: 'asc' },
        },
        _count: {
          select: { reviews: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: {
        category: true,
        inventory: true,
        images: {
          orderBy: { order: 'asc' },
        },
        reviews: {
          where: { isApproved: true },
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
        _count: {
          select: { reviews: true, orderItems: true },
        },
      },
    });

    if (!product) {
      throw new NotFoundException(`Product with ID "${id}" not found`);
    }

    return product;
  }

  async update(id: string, updateProductDto: UpdateProductDto) {
    const { stockAvailable, stockMinimum, ...productData } = updateProductDto;

    // Check if product exists
    await this.findOne(id);

    // Check if slug is being updated and if it's already taken
    if (updateProductDto.slug) {
      const existingSlug = await this.prisma.product.findUnique({
        where: { slug: updateProductDto.slug },
      });

      if (existingSlug && existingSlug.id !== id) {
        throw new ConflictException(`Product with slug "${updateProductDto.slug}" already exists`);
      }
    }

    // Check if category exists if being updated
    if (updateProductDto.categoryId) {
      const category = await this.prisma.category.findUnique({
        where: { id: updateProductDto.categoryId },
      });

      if (!category) {
        throw new NotFoundException(`Category with ID "${updateProductDto.categoryId}" not found`);
      }
    }

    // Update product and inventory in transaction
    return this.prisma.$transaction(async (tx) => {
      // Update product
      const product = await tx.product.update({
        where: { id },
        data: productData,
        include: {
          category: true,
          inventory: true,
          images: true,
        },
      });

      // Update inventory if provided
      if (stockAvailable !== undefined || stockMinimum !== undefined) {
        const inventoryData: { stockAvailable?: number; stockMinimum?: number } = {};
        if (stockAvailable !== undefined) inventoryData.stockAvailable = stockAvailable;
        if (stockMinimum !== undefined) inventoryData.stockMinimum = stockMinimum;

        await tx.inventory.update({
          where: { productId: id },
          data: inventoryData,
        });
      }

      return product;
    });
  }

  async remove(id: string) {
    // Check if product exists
    await this.findOne(id);

    // Check if product has orders
    const ordersCount = await this.prisma.orderItem.count({
      where: { productId: id },
    });

    if (ordersCount > 0) {
      throw new ConflictException(
        `Cannot delete product that has been ordered ${ordersCount} time(s). Consider marking it as inactive instead.`,
      );
    }

    // Delete product (cascade will delete inventory and images)
    return this.prisma.product.delete({
      where: { id },
    });
  }

  async findByCategory(categoryId: string) {
    return this.prisma.product.findMany({
      where: { categoryId },
      include: {
        category: true,
        inventory: true,
        images: {
          orderBy: { order: 'asc' },
          take: 1,
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}
