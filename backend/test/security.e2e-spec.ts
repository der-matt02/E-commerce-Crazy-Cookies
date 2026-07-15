import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import rateLimit from 'express-rate-limit';
import * as bcrypt from 'bcryptjs';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/database/prisma.service';
import { CouponType } from '@prisma/client';

/**
 * Suite dedicada a casos adversariales: cupones aplicados en checkout real,
 * búsqueda pública de pedidos, autorización (401 sin token) y validación de
 * inputs maliciosos/fuera de rango. Bootstrapea la app replicando main.ts
 * (prefijo /api, rate limiting, ValidationPipe estricto) porque los otros
 * e2e-spec no aplican ese bootstrap real.
 */
describe('Security & Edge Cases (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  let superAdminToken: string;
  let moderatorToken: string;
  let superAdminId: string;
  let moderatorId: string;
  let categoryId: string;
  let productId: string;
  let couponId: string;
  let orderIds: string[] = [];

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.use(
      '/api/orders/lookup',
      rateLimit({
        windowMs: 15 * 60 * 1000,
        max: 10,
        message: 'Demasiados intentos de búsqueda, intenta de nuevo más tarde.',
      }),
    );
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: { enableImplicitConversion: true },
      }),
    );
    await app.init();

    prisma = app.get<PrismaService>(PrismaService);
    await setupTestData();

    const superLogin = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'security-super@e2e.com', password: 'TestPass123!' });
    superAdminToken = superLogin.body.token;

    const modLogin = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'security-mod@e2e.com', password: 'TestPass123!' });
    moderatorToken = modLogin.body.token;
  });

  afterAll(async () => {
    await cleanupTestData();
    await app.close();
  });

  async function setupTestData() {
    const hashedPassword = await bcrypt.hash('TestPass123!', 10);

    const superAdmin = await prisma.admin.create({
      data: {
        email: 'security-super@e2e.com',
        password: hashedPassword,
        name: 'Security Super Admin',
        role: 'SUPER_ADMIN',
        isActive: true,
      },
    });
    superAdminId = superAdmin.id;

    const moderator = await prisma.admin.create({
      data: {
        email: 'security-mod@e2e.com',
        password: hashedPassword,
        name: 'Security Moderator',
        role: 'MODERATOR',
        isActive: true,
      },
    });
    moderatorId = moderator.id;

    const category = await prisma.category.create({
      data: { name: 'Security Category', slug: 'security-category', isActive: true, order: 1 },
    });
    categoryId = category.id;

    const product = await prisma.product.create({
      data: {
        name: 'Security Product',
        slug: 'security-product',
        description: 'Product for security e2e',
        price: 20000,
        categoryId: category.id,
        isActive: true,
      },
    });
    productId = product.id;

    await prisma.inventory.create({
      data: { productId: product.id, stockAvailable: 100, stockReserved: 0, stockMinimum: 5 },
    });
  }

  async function cleanupTestData() {
    for (const orderId of orderIds) {
      await prisma.orderStatusHistory.deleteMany({ where: { orderId } });
      await prisma.orderItem.deleteMany({ where: { orderId } });
      await prisma.order.delete({ where: { id: orderId } }).catch(() => undefined);
    }
    if (couponId) {
      await prisma.coupon.delete({ where: { id: couponId } }).catch(() => undefined);
    }
    await prisma.inventoryMovement.deleteMany({ where: { inventory: { productId } } });
    await prisma.inventory.delete({ where: { productId } }).catch(() => undefined);
    await prisma.product.delete({ where: { id: productId } }).catch(() => undefined);
    await prisma.category.delete({ where: { id: categoryId } }).catch(() => undefined);
    await prisma.admin.delete({ where: { id: superAdminId } }).catch(() => undefined);
    await prisma.admin.delete({ where: { id: moderatorId } }).catch(() => undefined);
  }

  describe('Coupon applied end-to-end in checkout', () => {
    it('SUPER_ADMIN creates a PERCENTAGE coupon', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/coupons')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({ code: 'SECTEST10', type: CouponType.PERCENTAGE, value: 10, isActive: true })
        .expect(201);

      couponId = response.body.id;
      expect(response.body.usedCount).toBe(0);
    });

    it('POST /coupons/validate returns computed discount before checkout', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/coupons/validate')
        .send({ code: 'SECTEST10', subtotal: 40000 })
        .expect(200);

      expect(response.body.discount).toBe(4000);
    });

    it('POST /coupons/validate rejects unknown code', async () => {
      await request(app.getHttpServer())
        .post('/api/coupons/validate')
        .send({ code: 'DOES-NOT-EXIST', subtotal: 40000 })
        .expect(400);
    });

    it('applies the coupon on a real order and increments usedCount', async () => {
      const sessionId = `security-session-${Date.now()}`;

      await request(app.getHttpServer())
        .post(`/api/cart?sessionId=${sessionId}`)
        .send({ productId, quantity: 2 })
        .expect(201);

      const orderResponse = await request(app.getHttpServer())
        .post(`/api/orders?sessionId=${sessionId}`)
        .send({
          customerName: 'Coupon Customer',
          customerPhone: '3009998877',
          deliveryAddress: 'Calle Cupón 123, Quito',
          couponCode: 'SECTEST10',
        })
        .expect(201);

      orderIds.push(orderResponse.body.id);
      // subtotal 40000 + IVA 19% (7600) - descuento 10% del subtotal (4000) = 43600
      expect(Number(orderResponse.body.subtotal)).toBe(40000);
      expect(Number(orderResponse.body.discount)).toBe(4000);
      expect(Number(orderResponse.body.total)).toBe(43600);

      const coupon = await prisma.coupon.findUnique({ where: { id: couponId } });
      expect(coupon!.usedCount).toBe(1);
    });

    it('rejects an inactive coupon at checkout', async () => {
      await prisma.coupon.update({ where: { id: couponId }, data: { isActive: false } });
      const sessionId = `security-session-inactive-${Date.now()}`;

      await request(app.getHttpServer())
        .post(`/api/cart?sessionId=${sessionId}`)
        .send({ productId, quantity: 1 })
        .expect(201);

      const response = await request(app.getHttpServer())
        .post(`/api/orders?sessionId=${sessionId}`)
        .send({
          customerName: 'Coupon Customer 2',
          customerPhone: '3009998877',
          deliveryAddress: 'Calle Cupón 123, Quito',
          couponCode: 'SECTEST10',
        })
        .expect(400);

      expect(response.body.message).toBeDefined();
      await prisma.coupon.update({ where: { id: couponId }, data: { isActive: true } });
    });
  });

  describe('POST /orders/lookup (public order lookup)', () => {
    it('finds an order by orderNumber + matching phone', async () => {
      const order = await prisma.order.findUnique({ where: { id: orderIds[0] } });

      const response = await request(app.getHttpServer())
        .post('/api/orders/lookup')
        .send({ orderNumber: order!.orderNumber, customerPhone: '3009998877' })
        .expect(200);

      expect(response.body.id).toBe(orderIds[0]);
    });

    it('returns 404 when the phone does not match the order', async () => {
      const order = await prisma.order.findUnique({ where: { id: orderIds[0] } });

      await request(app.getHttpServer())
        .post('/api/orders/lookup')
        .send({ orderNumber: order!.orderNumber, customerPhone: '3000000000' })
        .expect(404);
    });

    it('returns 404 for a nonexistent orderNumber', async () => {
      await request(app.getHttpServer())
        .post('/api/orders/lookup')
        .send({ orderNumber: 'ORD-DOES-NOT-EXIST', customerPhone: '3009998877' })
        .expect(404);
    });

    it('rejects a malformed phone (not 10 digits)', async () => {
      await request(app.getHttpServer())
        .post('/api/orders/lookup')
        .send({ orderNumber: 'ORD-ANY', customerPhone: '123' })
        .expect(400);
    });

    it('rate-limits repeated lookup attempts from the same IP (brute-force protection)', async () => {
      const attempt = () =>
        request(app.getHttpServer())
          .post('/api/orders/lookup')
          .send({ orderNumber: 'ORD-BRUTE-FORCE', customerPhone: '3000000001' });

      // Ya se hicieron 4 llamadas a /lookup en los tests anteriores dentro de esta suite,
      // dispara suficientes para superar el límite de 10 por ventana de 15 min.
      let last429 = false;
      for (let i = 0; i < 10; i++) {
        const res = await attempt();
        if (res.status === 429) {
          last429 = true;
          break;
        }
      }
      expect(last429).toBe(true);
    });
  });

  describe('Authorization: rutas admin sin token', () => {
    it('GET /orders (list) requires a token', async () => {
      await request(app.getHttpServer()).get('/api/orders').expect(401);
    });

    it('PATCH /orders/:id/status requires a token', async () => {
      await request(app.getHttpServer())
        .patch(`/api/orders/${orderIds[0]}/status`)
        .send({ status: 'CONFIRMED' })
        .expect(401);
    });

    it('POST /coupons requires a token', async () => {
      await request(app.getHttpServer())
        .post('/api/coupons')
        .send({ code: 'NOPE', type: CouponType.FIXED, value: 1000 })
        .expect(401);
    });

    it('rejects a malformed/garbage bearer token', async () => {
      await request(app.getHttpServer())
        .get('/api/orders')
        .set('Authorization', 'Bearer this.is.not.a.valid.jwt')
        .expect(401);
    });
  });

  describe('RBAC: MODERATOR vs SUPER_ADMIN', () => {
    it('rejects a MODERATOR trying to create a coupon (SUPER_ADMIN/ADMIN only) with 403', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/coupons')
        .set('Authorization', `Bearer ${moderatorToken}`)
        .send({ code: 'MODREJECTED', type: CouponType.FIXED, value: 1000, isActive: true });

      expect(response.status).toBe(403);
    });

    it('allows a SUPER_ADMIN to create a coupon', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/coupons')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({ code: 'SUPERCREATED', type: CouponType.FIXED, value: 1000, isActive: true });

      expect(response.status).toBe(201);
      await prisma.coupon.delete({ where: { id: response.body.id } }).catch(() => undefined);
    });

    it('rejects a MODERATOR trying to adjust inventory stock (SUPER_ADMIN/ADMIN only) with 403', async () => {
      const response = await request(app.getHttpServer())
        .post(`/api/inventory/${productId}/adjust`)
        .set('Authorization', `Bearer ${moderatorToken}`)
        .send({ type: 'IN', quantity: 1 });

      expect(response.status).toBe(403);
    });

    it('still allows a MODERATOR to read admin-only resources (no @Roles on GET endpoints)', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/coupons')
        .set('Authorization', `Bearer ${moderatorToken}`);

      expect(response.status).toBe(200);
    });
  });

  describe('Validación estricta de inputs (whitelist + forbidNonWhitelisted)', () => {
    it('rejects unknown/extra fields in the body (mass-assignment protection)', async () => {
      const sessionId = `security-session-extra-${Date.now()}`;
      await request(app.getHttpServer())
        .post(`/api/cart?sessionId=${sessionId}`)
        .send({ productId, quantity: 1 })
        .expect(201);

      await request(app.getHttpServer())
        .post(`/api/orders?sessionId=${sessionId}`)
        .send({
          customerName: 'Extra Fields Customer',
          customerPhone: '3001112233',
          deliveryAddress: 'Calle Extra 123, Quito',
          isAdmin: true, // campo no permitido — intento de mass-assignment
          total: 1, // intento de forzar el total desde el cliente
        })
        .expect(400);
    });

    it('rejects deliveryAddress shorter than the minimum length', async () => {
      const sessionId = `security-session-short-${Date.now()}`;
      await request(app.getHttpServer())
        .post(`/api/cart?sessionId=${sessionId}`)
        .send({ productId, quantity: 1 })
        .expect(201);

      await request(app.getHttpServer())
        .post(`/api/orders?sessionId=${sessionId}`)
        .send({ customerName: 'Short Address', customerPhone: '3001112233', deliveryAddress: 'x' })
        .expect(400);
    });

    it('rejects an oversized deliveryAddress beyond MaxLength(200)', async () => {
      const sessionId = `security-session-long-${Date.now()}`;
      await request(app.getHttpServer())
        .post(`/api/cart?sessionId=${sessionId}`)
        .send({ productId, quantity: 1 })
        .expect(201);

      await request(app.getHttpServer())
        .post(`/api/orders?sessionId=${sessionId}`)
        .send({
          customerName: 'Long Address',
          customerPhone: '3001112233',
          deliveryAddress: 'A'.repeat(201),
        })
        .expect(400);
    });

    it('rejects an invalid phone format', async () => {
      const sessionId = `security-session-phone-${Date.now()}`;
      await request(app.getHttpServer())
        .post(`/api/cart?sessionId=${sessionId}`)
        .send({ productId, quantity: 1 })
        .expect(201);

      await request(app.getHttpServer())
        .post(`/api/orders?sessionId=${sessionId}`)
        .send({
          customerName: 'Bad Phone',
          customerPhone: 'not-a-phone',
          deliveryAddress: 'Calle Válida 123, Quito',
        })
        .expect(400);
    });

    it('stores a script-tag-like string in customerName as inert plain text (no server-side sanitization, but no execution risk over JSON API)', async () => {
      const sessionId = `security-session-xss-${Date.now()}`;
      await request(app.getHttpServer())
        .post(`/api/cart?sessionId=${sessionId}`)
        .send({ productId, quantity: 1 })
        .expect(201);

      const payload = '<script>alert(1)</script>';
      const response = await request(app.getHttpServer())
        .post(`/api/orders?sessionId=${sessionId}`)
        .send({
          customerName: payload,
          customerPhone: '3001112233',
          deliveryAddress: 'Calle Válida 123, Quito',
        })
        .expect(201);

      orderIds.push(response.body.id);
      // El backend no sanitiza (correcto: no es su responsabilidad, el frontend con React
      // escapa por defecto). Se documenta que el string llega intacto para que el consumidor
      // (frontend) tenga la responsabilidad de escapar al renderizar.
      expect(response.body.customerName).toBe(payload);
    });

    it('rejects a negative or zero quantity when adding to cart', async () => {
      const sessionId = `security-session-qty-${Date.now()}`;
      await request(app.getHttpServer())
        .post(`/api/cart?sessionId=${sessionId}`)
        .send({ productId, quantity: -1 })
        .expect(400);

      await request(app.getHttpServer())
        .post(`/api/cart?sessionId=${sessionId}`)
        .send({ productId, quantity: 0 })
        .expect(400);
    });

    it('rejects a malformed (non-UUID) productId with 400 before hitting the service', async () => {
      const sessionId = `security-session-baduuid-${Date.now()}`;
      await request(app.getHttpServer())
        .post(`/api/cart?sessionId=${sessionId}`)
        .send({ productId: 'not-a-uuid', quantity: 1 })
        .expect(400);
    });

    it('rejects adding a well-formed but nonexistent productId with 404', async () => {
      const sessionId = `security-session-nop-${Date.now()}`;
      await request(app.getHttpServer())
        .post(`/api/cart?sessionId=${sessionId}`)
        .send({ productId: '00000000-0000-0000-0000-000000000000', quantity: 1 })
        .expect(404);
    });
  });
});
