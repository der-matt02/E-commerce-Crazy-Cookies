import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaService } from './database/prisma.service';

// Feature modules
import { ProductsModule } from '@modules/products/products.module';
import { CategoriesModule } from '@modules/categories/categories.module';
import { AdminModule } from '@modules/admin/admin.module';
import { InventoryModule } from '@modules/inventory/inventory.module';
import { CartModule } from '@modules/cart/cart.module';
import { OrdersModule } from '@modules/orders/orders.module';
import { ReviewsModule } from '@modules/reviews/reviews.module';
import { NotificationsModule } from '@modules/notifications/notifications.module';
import { AuditModule } from '@modules/audit/audit.module';

@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),

    // Cron jobs
    ScheduleModule.forRoot(),

    // Feature modules
    ProductsModule,
    CategoriesModule,
    AdminModule,
    InventoryModule,
    CartModule,
    OrdersModule,
    ReviewsModule,
    NotificationsModule,
    AuditModule,
  ],
  controllers: [AppController],
  providers: [AppService, PrismaService],
})
export class AppModule {}
