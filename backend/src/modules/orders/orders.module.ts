import { Module } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { PrismaService } from '../../database/prisma.service';
import { CouponsModule } from '@modules/coupons/coupons.module';

@Module({
  imports: [CouponsModule],
  controllers: [OrdersController],
  providers: [OrdersService, PrismaService],
  exports: [OrdersService],
})
export class OrdersModule {}
