import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import * as bcrypt from 'bcryptjs';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/database/prisma.service';

describe('E-commerce User Journey (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let productId: string;
  let categoryId: string;
  let cartSessionId: string;
  let orderId: string;
  let adminId: string;
  let authToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
    await app.init();

    prisma = app.get<PrismaService>(PrismaService);

    await setupTestData();

    // Login to get JWT token for protected routes
    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'test-admin@e2e.com', password: 'TestPass123!' });
    authToken = loginResponse.body.token;
  });

  afterAll(async () => {
    await cleanupTestData();
    await app.close();
  });

  async function setupTestData() {
    // Create admin user for protected route tests
    const hashedPassword = await bcrypt.hash('TestPass123!', 10);
    const admin = await prisma.admin.create({
      data: {
        email: 'test-admin@e2e.com',
        password: hashedPassword,
        name: 'Test Admin',
        isActive: true,
      },
    });
    adminId = admin.id;

    // Create category
    const category = await prisma.category.create({
      data: {
        name: 'Test Category',
        slug: 'test-category',
        isActive: true,
        order: 1,
      },
    });
    categoryId = category.id;

    // Create product
    const product = await prisma.product.create({
      data: {
        name: 'Test Product',
        slug: 'test-product',
        description: 'Test product description',
        price: 10000,
        categoryId: category.id,
        isActive: true,
      },
    });
    productId = product.id;

    // Create inventory
    await prisma.inventory.create({
      data: {
        productId: product.id,
        stockAvailable: 100,
        stockReserved: 0,
        stockMinimum: 5,
      },
    });
  }

  async function cleanupTestData() {
    // Delete in reverse order of creation due to foreign keys
    if (orderId) {
      await prisma.orderStatusHistory.deleteMany({ where: { orderId } });
      await prisma.orderItem.deleteMany({ where: { orderId } });
      await prisma.order.delete({ where: { id: orderId } });
    }
    await prisma.inventoryMovement.deleteMany({ where: { inventory: { productId } } });
    await prisma.inventory.delete({ where: { productId } });
    await prisma.product.delete({ where: { id: productId } });
    await prisma.category.delete({ where: { id: categoryId } });
    if (adminId) {
      await prisma.admin.delete({ where: { id: adminId } });
    }
  }

  describe('Complete User Journey: Browse → Add to Cart → Checkout → Order', () => {
    it('Step 1: GET /products - should return active products', async () => {
      const response = await request(app.getHttpServer())
        .get('/products')
        .expect(200);

      expect(response.body).toBeInstanceOf(Array);
      expect(response.body.length).toBeGreaterThan(0);

      const testProduct = response.body.find((p: any) => p.id === productId);
      expect(testProduct).toBeDefined();
      expect(testProduct.name).toBe('Test Product');
      expect(testProduct.isActive).toBe(true);
    });

    it('Step 2: GET /products/:id - should return product details', async () => {
      const response = await request(app.getHttpServer())
        .get(`/products/${productId}`)
        .expect(200);

      expect(response.body.id).toBe(productId);
      expect(response.body.name).toBe('Test Product');
      expect(response.body.inventory).toBeDefined();
      expect(response.body.inventory.stockAvailable).toBe(100);
    });

    it('Step 3: POST /cart - should add product to cart', async () => {
      cartSessionId = `test-session-${Date.now()}`;

      const response = await request(app.getHttpServer())
        .post(`/cart?sessionId=${cartSessionId}`)
        .send({
          productId,
          quantity: 2,
        })
        .expect(201);

      expect(response.body.items).toBeDefined();
      expect(response.body.items.length).toBe(1);
      expect(response.body.items[0].quantity).toBe(2);
      expect(response.body.items[0].productId).toBe(productId);
    });

    it('Step 4: GET /cart - should return cart with items', async () => {
      const response = await request(app.getHttpServer())
        .get(`/cart?sessionId=${cartSessionId}`)
        .expect(200);

      expect(response.body.items).toBeDefined();
      expect(response.body.items.length).toBe(1);
      expect(response.body.items[0].quantity).toBe(2);
    });

    it('Step 5: Verify stock reservation', async () => {
      const inventory = await prisma.inventory.findUnique({
        where: { productId },
      });

      expect(inventory).toBeDefined();
      expect(inventory!.stockReserved).toBe(2);
      expect(inventory!.stockAvailable).toBe(100);
    });

    it('Step 6: PATCH /cart/items/:id - should update item quantity', async () => {
      const cart = await request(app.getHttpServer())
        .get(`/cart?sessionId=${cartSessionId}`)
        .expect(200);

      const itemId = cart.body.items[0].id;

      const response = await request(app.getHttpServer())
        .patch(`/cart/items/${itemId}?sessionId=${cartSessionId}`)
        .send({ quantity: 3 })
        .expect(200);

      expect(response.body.items[0].quantity).toBe(3);

      // Verify stock reservation updated
      const inventory = await prisma.inventory.findUnique({
        where: { productId },
      });
      expect(inventory!.stockReserved).toBe(3);
    });

    it('Step 7: POST /orders - should create order from cart', async () => {
      const response = await request(app.getHttpServer())
        .post(`/orders?sessionId=${cartSessionId}`)
        .send({
          customerName: 'Test Customer',
          customerPhone: '3001234567',
          customerEmail: 'test@example.com',
          deliveryAddress: 'Calle 123 #45-67, Bogotá',
          notes: 'Test order',
        })
        .expect(201);

      orderId = response.body.id;

      expect(response.body.id).toBeDefined();
      expect(response.body.customerName).toBe('Test Customer');
      expect(response.body.status).toBe('PENDING');
      expect(response.body.items).toBeDefined();
      expect(response.body.items.length).toBe(1);
      expect(response.body.total).toBeGreaterThan(0);
    });

    it('Step 8: Verify cart deleted after order creation', async () => {
      await request(app.getHttpServer())
        .get(`/cart?sessionId=${cartSessionId}`)
        .expect(200)
        .then((response) => {
          // Cart should exist but be empty
          expect(response.body.items).toBeDefined();
          expect(response.body.items.length).toBe(0);
        });
    });

    it('Step 9: Verify inventory updated after order', async () => {
      const inventory = await prisma.inventory.findUnique({
        where: { productId },
      });

      expect(inventory).toBeDefined();
      // Stock should be decremented (both reserved and available)
      expect(inventory!.stockAvailable).toBe(97); // 100 - 3
      expect(inventory!.stockReserved).toBe(0); // Reset after order
    });

    it('Step 10: GET /orders/:id - should return order details', async () => {
      const response = await request(app.getHttpServer())
        .get(`/orders/${orderId}`)
        .expect(200);

      expect(response.body.id).toBe(orderId);
      expect(response.body.status).toBe('PENDING');
      expect(response.body.items.length).toBe(1);
    });

    it('Step 11: PATCH /orders/:id/status - should update order status', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/orders/${orderId}/status`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          status: 'CONFIRMED',
          note: 'Order confirmed by test',
        })
        .expect(200);

      expect(response.body.status).toBe('CONFIRMED');
      expect(response.body.statusHistory).toBeDefined();
    });
  });

  describe('Review Flow', () => {
    let reviewId: string;

    it('POST /reviews/products/:id - should create review', async () => {
      const response = await request(app.getHttpServer())
        .post(`/reviews/products/${productId}`)
        .send({
          customerName: 'Test Reviewer',
          customerEmail: 'reviewer@test.com',
          rating: 5,
          comment: 'Great product!',
        })
        .expect(201);

      reviewId = response.body.id;

      expect(response.body.isApproved).toBe(false); // Default is not approved
      expect(response.body.rating).toBe(5);
    });

    it('GET /reviews/products/:id - should not return unapproved reviews', async () => {
      const response = await request(app.getHttpServer())
        .get(`/reviews/products/${productId}`)
        .expect(200);

      expect(response.body).toBeInstanceOf(Array);
      expect(response.body.length).toBe(0); // No approved reviews yet
    });

    it('PATCH /reviews/:id/approve - should approve review', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/reviews/${reviewId}/approve`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ isApproved: true })
        .expect(200);

      expect(response.body.isApproved).toBe(true);
    });

    it('GET /reviews/products/:id - should return approved review', async () => {
      const response = await request(app.getHttpServer())
        .get(`/reviews/products/${productId}`)
        .expect(200);

      expect(response.body.length).toBe(1);
      expect(response.body[0].id).toBe(reviewId);
    });

    it('GET /reviews/products/:id/stats - should return rating stats', async () => {
      const response = await request(app.getHttpServer())
        .get(`/reviews/products/${productId}/stats`)
        .expect(200);

      expect(response.body.average).toBe(5);
      expect(response.body.count).toBe(1);
      expect(response.body.distribution[5]).toBe(1);
    });

    afterAll(async () => {
      // Cleanup review
      if (reviewId) {
        await prisma.review.delete({ where: { id: reviewId } });
      }
    });
  });
});
