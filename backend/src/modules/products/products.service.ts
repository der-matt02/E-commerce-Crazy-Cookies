import {
  BadRequestException,
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '@/database/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { existsSync } from 'fs';
import { unlink } from 'fs/promises';
import { join } from 'path';

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

  async findAll(page = 1, limit = 50) {
    const skip = (page - 1) * limit;
    const [products, total] = await Promise.all([
      this.prisma.product.findMany({
        include: {
          category: true,
          inventory: true,
          images: {
            orderBy: { order: 'asc' },
            take: 1,
          },
          _count: {
            select: { reviews: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.product.count(),
    ]);

    return {
      products,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrev: page > 1,
      },
    };
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

  async search(params: {
    query?: string;
    categoryId?: string;
    minPrice?: number;
    maxPrice?: number;
    inStock?: boolean;
    sortBy?: 'price_asc' | 'price_desc' | 'name' | 'newest';
    page?: number;
    limit?: number;
  }) {
    const {
      query,
      categoryId,
      minPrice,
      maxPrice,
      inStock,
      sortBy = 'newest',
      page = 1,
      limit = 12,
    } = params;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {
      isActive: true,
    };

    // Text search on name and description
    if (query) {
      where.OR = [{ name: { contains: query } }, { description: { contains: query } }];
    }

    // Filter by category
    if (categoryId) {
      where.categoryId = categoryId;
    }

    // Price range filter
    if (minPrice !== undefined || maxPrice !== undefined) {
      where.price = {};
      if (minPrice !== undefined) where.price.gte = minPrice;
      if (maxPrice !== undefined) where.price.lte = maxPrice;
    }

    // In stock filter
    if (inStock) {
      where.inventory = {
        stockAvailable: { gt: 0 },
      };
    }

    // Sorting options
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let orderBy: any;
    switch (sortBy) {
      case 'price_asc':
        orderBy = { price: 'asc' };
        break;
      case 'price_desc':
        orderBy = { price: 'desc' };
        break;
      case 'name':
        orderBy = { name: 'asc' };
        break;
      case 'newest':
      default:
        orderBy = { createdAt: 'desc' };
    }

    const skip = (page - 1) * limit;

    const [products, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        include: {
          category: true,
          inventory: true,
          images: {
            orderBy: { order: 'asc' },
            take: 1,
          },
          _count: {
            select: { reviews: true },
          },
        },
        orderBy,
        skip,
        take: limit,
      }),
      this.prisma.product.count({ where }),
    ]);

    return {
      products,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrev: page > 1,
      },
    };
  }

  async getFeatured(limit = 8) {
    return this.prisma.product.findMany({
      where: {
        isActive: true,
        inventory: {
          stockAvailable: { gt: 0 },
        },
      },
      include: {
        category: true,
        inventory: true,
        images: {
          orderBy: { order: 'asc' },
          take: 1,
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  async addImage(productId: string, file: Express.Multer.File) {
    await this.findOne(productId);

    const lastImage = await this.prisma.productImage.findFirst({
      where: { productId },
      orderBy: { order: 'desc' },
    });
    const order = (lastImage?.order ?? -1) + 1;

    return this.prisma.productImage.create({
      data: {
        productId,
        url: `/uploads/products/${file.filename}`,
        alt: file.originalname,
        order,
      },
    });
  }

  async removeImage(productId: string, imageId: string) {
    const image = await this.prisma.productImage.findFirst({
      where: { id: imageId, productId },
    });

    if (!image) {
      throw new NotFoundException('Image not found');
    }

    const uploadsDir = join(process.cwd(), 'uploads');
    const filePath = join(process.cwd(), image.url);
    if (!filePath.startsWith(uploadsDir)) {
      throw new BadRequestException('Invalid file path');
    }
    // eslint-disable-next-line security/detect-non-literal-fs-filename
    if (existsSync(filePath)) {
      // eslint-disable-next-line security/detect-non-literal-fs-filename
      await unlink(filePath);
    }

    await this.prisma.productImage.delete({ where: { id: imageId } });
  }
}
