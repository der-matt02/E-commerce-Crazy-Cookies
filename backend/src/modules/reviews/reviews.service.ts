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

  async getByProduct(productId: string, includeUnapproved = false) {
    const where = includeUnapproved
      ? { productId }
      : { productId, isApproved: true };

    const reviews = await this.prisma.review.findMany({
      where,
      include: {
        images: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return reviews;
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

  async getAll(approved?: boolean) {
    const where = approved !== undefined ? { isApproved: approved } : {};

    const reviews = await this.prisma.review.findMany({
      where,
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
    const reviews = await this.prisma.review.findMany({
      where: { productId, isApproved: true },
      select: { rating: true },
    });

    if (reviews.length === 0) {
      return {
        average: 0,
        count: 0,
        distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
      };
    }

    const sum = reviews.reduce((acc, r) => acc + r.rating, 0);
    const average = sum / reviews.length;

    const distribution = reviews.reduce((acc, r) => {
      acc[r.rating] = (acc[r.rating] || 0) + 1;
      return acc;
    }, {} as Record<number, number>);

    return {
      average: Math.round(average * 10) / 10,
      count: reviews.length,
      distribution: {
        1: distribution[1] || 0,
        2: distribution[2] || 0,
        3: distribution[3] || 0,
        4: distribution[4] || 0,
        5: distribution[5] || 0,
      },
    };
  }
}
