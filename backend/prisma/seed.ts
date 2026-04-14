import { PrismaClient, AdminRole } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Admin
  const hashedPassword = await bcrypt.hash('Admin123!', 10);
  await prisma.admin.upsert({
    where: { email: 'admin@crazycookies.com' },
    update: {},
    create: {
      name: 'Administrador',
      email: 'admin@crazycookies.com',
      password: hashedPassword,
      role: AdminRole.SUPER_ADMIN,
    },
  });
  console.log('✅ Admin creado');

  // Categories
  const galletas = await prisma.category.upsert({
    where: { slug: 'galletas' },
    update: {},
    create: { name: 'Galletas', slug: 'galletas', description: 'Galletas artesanales', isActive: true, order: 1 },
  });
  const brownies = await prisma.category.upsert({
    where: { slug: 'brownies' },
    update: {},
    create: { name: 'Brownies', slug: 'brownies', description: 'Brownies de chocolate', isActive: true, order: 2 },
  });
  const pasteles = await prisma.category.upsert({
    where: { slug: 'pasteles' },
    update: {},
    create: { name: 'Pasteles', slug: 'pasteles', description: 'Pasteles personalizados', isActive: true, order: 3 },
  });
  console.log('✅ Categorías creadas');

  // Products
  const products = [
    { name: 'Galleta de Chocochips', slug: 'galleta-chocochips', description: 'Crujiente por fuera, suave por dentro. Cargada de chips de chocolate belga.', price: 3500, categoryId: galletas.id, stock: 50 },
    { name: 'Galleta de Mantequilla', slug: 'galleta-mantequilla', description: 'Clásica y deliciosa. Preparada con mantequilla francesa de primera calidad.', price: 2800, categoryId: galletas.id, stock: 40 },
    { name: 'Galleta de Avena con Pasas', slug: 'galleta-avena-pasas', description: 'La opción más saludable. Avena integral con pasas sultanas naturales.', price: 3200, categoryId: galletas.id, stock: 35 },
    { name: 'Brownie Clásico', slug: 'brownie-clasico', description: 'Intenso chocolate negro, textura fudge perfecta. El favorito de todos.', price: 5500, categoryId: brownies.id, stock: 25 },
    { name: 'Brownie con Nuez', slug: 'brownie-nuez', description: 'Nuestro brownie clásico elevado con nueces tostadas y caramelo artesanal.', price: 6500, categoryId: brownies.id, stock: 20 },
    { name: 'Brownie Red Velvet', slug: 'brownie-red-velvet', description: 'La fusión perfecta: brownie con crema de queso y terciopelo rojo.', price: 7000, categoryId: brownies.id, stock: 15 },
    { name: 'Pastel de Cumpleaños', slug: 'pastel-cumpleanos', description: 'Pastel personalizado para tu día especial. Sabores y decorados a tu gusto.', price: 85000, categoryId: pasteles.id, stock: 8 },
    { name: 'Pastel de Chocolate', slug: 'pastel-chocolate', description: 'Tres capas de bizcocho húmedo con ganache de chocolate y frutos rojos.', price: 75000, categoryId: pasteles.id, stock: 10 },
  ];

  for (const p of products) {
    const existing = await prisma.product.findUnique({ where: { slug: p.slug } });
    if (!existing) {
      await prisma.product.create({
        data: {
          name: p.name,
          slug: p.slug,
          description: p.description,
          price: p.price,
          categoryId: p.categoryId,
          isActive: true,
          inventory: {
            create: { stockAvailable: p.stock, stockReserved: 0, stockMinimum: 5 },
          },
        },
      });
    }
  }
  console.log('✅ Productos creados');
  console.log('🎉 Seed completado. Admin: admin@crazycookies.com / Admin123!');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
