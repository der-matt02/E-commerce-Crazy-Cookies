import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

export enum AuditAction {
  // Products
  PRODUCT_CREATED = 'PRODUCT_CREATED',
  PRODUCT_UPDATED = 'PRODUCT_UPDATED',
  PRODUCT_DELETED = 'PRODUCT_DELETED',

  // Categories
  CATEGORY_CREATED = 'CATEGORY_CREATED',
  CATEGORY_UPDATED = 'CATEGORY_UPDATED',
  CATEGORY_DELETED = 'CATEGORY_DELETED',

  // Inventory
  INVENTORY_ADJUSTED = 'INVENTORY_ADJUSTED',
  STOCK_LOW_ALERT = 'STOCK_LOW_ALERT',

  // Orders
  ORDER_CREATED = 'ORDER_CREATED',
  ORDER_STATUS_CHANGED = 'ORDER_STATUS_CHANGED',
  ORDER_CANCELLED = 'ORDER_CANCELLED',

  // Reviews
  REVIEW_CREATED = 'REVIEW_CREATED',
  REVIEW_APPROVED = 'REVIEW_APPROVED',
  REVIEW_REJECTED = 'REVIEW_REJECTED',
  REVIEW_DELETED = 'REVIEW_DELETED',

  // Admin
  ADMIN_LOGIN = 'ADMIN_LOGIN',
  ADMIN_LOGOUT = 'ADMIN_LOGOUT',
  ADMIN_CREATED = 'ADMIN_CREATED',
}

export interface AuditLogData {
  action: AuditAction;
  entity: string;
  entityId?: string;
  adminId?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  oldValue?: Record<string, any>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  newValue?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private prisma: PrismaService) {}

  async log(data: AuditLogData): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: {
          action: data.action,
          entity: data.entity,
          entityId: data.entityId || '',
          adminId: data.adminId,
          oldValue: data.oldValue || undefined,
          newValue: data.newValue || undefined,
          ipAddress: data.ipAddress,
          userAgent: data.userAgent,
        },
      });

      this.logger.log(
        `[AUDIT] ${data.action} - ${data.entity}${data.entityId ? ` #${data.entityId}` : ''}`,
      );
    } catch (error) {
      this.logger.error('Failed to create audit log:', error);
    }
  }

  async getAll(filters?: {
    action?: AuditAction;
    entity?: string;
    adminId?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
    offset?: number;
  }) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {};

    if (filters?.action) where.action = filters.action;
    if (filters?.entity) where.entity = filters.entity;
    if (filters?.adminId) where.adminId = filters.adminId;

    if (filters?.startDate || filters?.endDate) {
      where.createdAt = {};
      if (filters.startDate) where.createdAt.gte = filters.startDate;
      if (filters.endDate) where.createdAt.lte = filters.endDate;
    }

    const [logs, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: filters?.limit || 50,
        skip: filters?.offset || 0,
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return { logs, total };
  }

  async getByEntity(entity: string, entityId: string) {
    return this.prisma.auditLog.findMany({
      where: { entity, entityId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getRecent(limit = 20) {
    return this.prisma.auditLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  async getStats(days = 7) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const logs = await this.prisma.auditLog.findMany({
      where: {
        createdAt: { gte: startDate },
      },
      select: { action: true },
    });

    const actionCounts = logs.reduce(
      (acc, log) => {
        acc[log.action] = (acc[log.action] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    return {
      totalLogs: logs.length,
      actionCounts,
      period: `Last ${days} days`,
    };
  }
}
