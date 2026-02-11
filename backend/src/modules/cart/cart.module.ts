import { Module } from '@nestjs/common';
import { CartService } from './cart.service';
import { CartController } from './cart.controller';
import { CartCleanupService } from './cart-cleanup.service';
import { PrismaService } from '../../database/prisma.service';

@Module({
  controllers: [CartController],
  providers: [CartService, CartCleanupService, PrismaService],
  exports: [CartService],
})
export class CartModule {}
