import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '@/database/prisma.service';
import { CouponType, Coupon } from '@prisma/client';
import { CreateCouponDto } from './dto/create-coupon.dto';
import { UpdateCouponDto } from './dto/update-coupon.dto';

@Injectable()
export class CouponsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createCouponDto: CreateCouponDto) {
    const code = createCouponDto.code.trim().toUpperCase();

    const existing = await this.prisma.coupon.findUnique({ where: { code } });
    if (existing) {
      throw new ConflictException(`Ya existe un cupón con el código "${code}"`);
    }

    return this.prisma.coupon.create({
      data: { ...createCouponDto, code },
    });
  }

  async findAll() {
    return this.prisma.coupon.findMany({ orderBy: { createdAt: 'desc' } });
  }

  async findOne(id: string) {
    const coupon = await this.prisma.coupon.findUnique({ where: { id } });
    if (!coupon) {
      throw new NotFoundException(`Cupón con ID "${id}" no encontrado`);
    }
    return coupon;
  }

  async update(id: string, updateCouponDto: UpdateCouponDto) {
    await this.findOne(id);

    const data = { ...updateCouponDto };
    if (data.code) {
      data.code = data.code.trim().toUpperCase();
      const existing = await this.prisma.coupon.findUnique({ where: { code: data.code } });
      if (existing && existing.id !== id) {
        throw new ConflictException(`Ya existe un cupón con el código "${data.code}"`);
      }
    }

    return this.prisma.coupon.update({ where: { id }, data });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.coupon.delete({ where: { id } });
  }

  /**
   * Valida un cupón contra un subtotal y calcula el descuento resultante.
   * No incrementa `usedCount` — eso ocurre en la misma transacción donde se crea la orden.
   */
  async validate(code: string, subtotal: number): Promise<{ coupon: Coupon; discount: number }> {
    const coupon = await this.prisma.coupon.findUnique({
      where: { code: code.trim().toUpperCase() },
    });

    if (!coupon) {
      throw new BadRequestException('El cupón no existe');
    }
    if (!coupon.isActive) {
      throw new BadRequestException('El cupón ya no está activo');
    }
    if (coupon.expiresAt && coupon.expiresAt < new Date()) {
      throw new BadRequestException('El cupón ha expirado');
    }
    if (coupon.maxUses !== null && coupon.usedCount >= coupon.maxUses) {
      throw new BadRequestException('El cupón alcanzó su límite de usos');
    }
    if (coupon.minPurchase && subtotal < Number(coupon.minPurchase)) {
      throw new BadRequestException(
        `Este cupón requiere una compra mínima de $${Number(coupon.minPurchase).toLocaleString('es-CO')}`,
      );
    }

    const discount =
      coupon.type === CouponType.PERCENTAGE
        ? Math.min(subtotal * (Number(coupon.value) / 100), subtotal)
        : Math.min(Number(coupon.value), subtotal);

    return { coupon, discount };
  }
}
