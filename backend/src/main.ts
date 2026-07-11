import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { AppModule } from './app.module';
import { join } from 'path';
import { mkdirSync } from 'fs';
import * as express from 'express';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  // Global prefix
  app.setGlobalPrefix('api');

  // Ensure uploads directory exists and serve static files
  const uploadsDir = join(process.cwd(), 'uploads', 'products');
  mkdirSync(uploadsDir, { recursive: true });
  app.use('/uploads', express.static(join(process.cwd(), 'uploads')));

  // Security
  app.use(helmet());

  // CORS
  app.enableCors({
    origin: configService.get('CORS_ORIGIN')?.split(',') || ['http://localhost:3001'],
    credentials: true,
  });

  // Rate limiting: límite estricto para la búsqueda pública de pedidos
  // (evita fuerza bruta sobre orderNumber + teléfono), antes del límite global.
  app.use(
    '/api/orders/lookup',
    rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: configService.get('RATE_LIMIT_LOOKUP_MAX') || 10,
      message: 'Demasiados intentos de búsqueda, intenta de nuevo más tarde.',
    }),
  );

  // Rate limiting
  // Se excluye /api/health: los liveness/readiness probes de Kubernetes lo
  // llaman cada 10-20s y superaban la cuota, provocando 429 que kubelet
  // interpreta como fallo de salud y reinicia el pod en loop.
  app.use(
    rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: configService.get('RATE_LIMIT_MAX') || 100,
      message: 'Too many requests from this IP, please try again later.',
      skip: (req) => req.path === '/api/health',
    }),
  );

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Swagger documentation
  if (configService.get('NODE_ENV') !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('Crazy Cookies E-commerce API')
      .setDescription('API para el e-commerce de Crazy Cookies - Galletas y Postres')
      .setVersion('1.0')
      .addTag('auth', 'Autenticación de administradores')
      .addTag('products', 'Gestión de productos')
      .addTag('categories', 'Gestión de categorías')
      .addTag('inventory', 'Control de inventario')
      .addTag('cart', 'Carrito de compras')
      .addTag('orders', 'Órdenes y checkout')
      .addTag('reviews', 'Reviews y ratings')
      .addTag('notifications', 'Notificaciones')
      .addTag('admin', 'Panel administrativo')
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document);
  }

  const port = configService.get('BACKEND_PORT') || 3000;
  await app.listen(port);
  console.log(`🚀 Backend running on: http://localhost:${port}`);
  console.log(`📚 API Documentation: http://localhost:${port}/api/docs`);
}

bootstrap();
