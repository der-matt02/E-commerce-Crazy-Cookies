import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/database/prisma.service';

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  async getStats() {
    const [
      totalProducts,
      activeProducts,
      totalCategories,
      totalOrders,
      pendingOrders,
      totalReviews,
      pendingReviews,
      lowStockProducts,
    ] = await Promise.all([
      // Total products
      this.prisma.product.count(),

      // Active products
      this.prisma.product.count({ where: { isActive: true } }),

      // Total categories
      this.prisma.category.count({ where: { isActive: true } }),

      // Total orders
      this.prisma.order.count(),

      // Pending orders
      this.prisma.order.count({ where: { status: 'PENDING' } }),

      // Total reviews
      this.prisma.review.count(),

      // Pending reviews
      this.prisma.review.count({ where: { isApproved: false } }),

      // Low stock products
      this.prisma.inventory.count({
        where: {
          stockAvailable: {
            lte: this.prisma.inventory.fields.stockMinimum,
          },
        },
      }),
    ]);

    // Get revenue (sum of all delivered orders)
    const revenue = await this.prisma.order.aggregate({
      where: { status: 'DELIVERED' },
      _sum: { total: true },
    });

    // Get recent orders
    const recentOrders = await this.prisma.order.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        orderNumber: true,
        customerName: true,
        total: true,
        status: true,
        createdAt: true,
      },
    });

    // Get top selling products
    const topProducts = await this.prisma.orderItem.groupBy({
      by: ['productId'],
      _sum: { quantity: true },
      orderBy: { _sum: { quantity: 'desc' } },
      take: 5,
    });

    const topProductsWithDetails = await Promise.all(
      topProducts.map(async (item) => {
        const product = await this.prisma.product.findUnique({
          where: { id: item.productId },
          select: { id: true, name: true, price: true },
        });
        return {
          ...product,
          totalSold: item._sum.quantity || 0,
        };
      }),
    );

    return {
      products: {
        total: totalProducts,
        active: activeProducts,
        inactive: totalProducts - activeProducts,
        lowStock: lowStockProducts,
      },
      categories: {
        total: totalCategories,
      },
      orders: {
        total: totalOrders,
        pending: pendingOrders,
        revenue: revenue._sum.total || 0,
      },
      reviews: {
        total: totalReviews,
        pending: pendingReviews,
        approved: totalReviews - pendingReviews,
      },
      recentOrders,
      topProducts: topProductsWithDetails,
    };
  }
}
