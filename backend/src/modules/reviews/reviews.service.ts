import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { ApproveReviewDto } from './dto/approve-review.dto';

@Injectable()
export class ReviewsService {
  constructor(private prisma: PrismaService) {}

  async create(productId: string, dto: CreateReviewDto) {
    // Verificar que el producto existe
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      throw new NotFoundException('Producto no encontrado');
    }

    if (!product.isActive) {
      throw new BadRequestException('No se pueden dejar reviews en productos inactivos');
    }

    // Crear review (isApproved = false por defecto)
    const review = await this.prisma.review.create({
      data: {
        productId,
        customerName: dto.customerName,
        customerEmail: dto.customerEmail,
        rating: dto.rating,
        comment: dto.comment,
      },
      include: {
        product: {
          select: { id: true, name: true },
        },
      },
    });

    return review;
  }

  async getByProduct(productId: string, includeUnapproved = false, page = 1, limit = 10) {
    const where = includeUnapproved
      ? { productId }
      : { productId, isApproved: true };

    const skip = (page - 1) * limit;
    const [reviews, total] = await Promise.all([
      this.prisma.review.findMany({
        where,
        include: { images: true },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.review.count({ where }),
    ]);

    return {
      reviews,
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

  async getPending() {
    const reviews = await this.prisma.review.findMany({
      where: { isApproved: false },
      include: {
        product: {
          select: { id: true, name: true },
        },
        images: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return reviews;
  }

  async getAll(approved?: boolean, page = 1, limit = 20) {
    const where = approved !== undefined ? { isApproved: approved } : {};
    const skip = (page - 1) * limit;

    const [reviews, total] = await Promise.all([
      this.prisma.review.findMany({
        where,
        include: {
          product: { select: { id: true, name: true } },
          images: true,
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.review.count({ where }),
    ]);

    return {
      reviews,
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

  async approve(id: string, dto: ApproveReviewDto, adminId?: string) {
    const review = await this.prisma.review.findUnique({
      where: { id },
    });

    if (!review) {
      throw new NotFoundException('Review no encontrada');
    }

    const updated = await this.prisma.review.update({
      where: { id },
      data: {
        isApproved: dto.isApproved,
        approvedBy: adminId,
        approvedAt: dto.isApproved ? new Date() : null,
      },
      include: {
        product: {
          select: { id: true, name: true },
        },
      },
    });

    return updated;
  }

  async delete(id: string) {
    const review = await this.prisma.review.findUnique({
      where: { id },
    });

    if (!review) {
      throw new NotFoundException('Review no encontrada');
    }

    await this.prisma.review.delete({
      where: { id },
    });

    return { message: 'Review eliminada correctamente' };
  }

  async getProductRatingStats(productId: string) {
    const groups = await this.prisma.review.groupBy({
      by: ['rating'],
      where: { productId, isApproved: true },
      _count: { rating: true },
    });

    if (groups.length === 0) {
      return {
        average: 0,
        count: 0,
        distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
      };
    }

    const distribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    let totalCount = 0;
    let weightedSum = 0;

    for (const group of groups) {
      const count = group._count.rating;
      distribution[group.rating] = count;
      totalCount += count;
      weightedSum += group.rating * count;
    }

    return {
      average: Math.round((weightedSum / totalCount) * 10) / 10,
      count: totalCount,
      distribution,
    };
  }
}
