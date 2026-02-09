import { PrismaClient } from '@prisma/client';

export async function seedCategories(prisma: PrismaClient) {
  const categories = [
    {
      name: 'Galletas',
      slug: 'galletas',
      description: 'Deliciosas galletas artesanales con diferentes sabores y texturas',
      order: 1,
      isActive: true,
    },
    {
      name: 'Brownies',
      slug: 'brownies',
      description: 'Brownies suaves y húmedos, perfectos para los amantes del chocolate',
      order: 2,
      isActive: true,
    },
    {
      name: 'Pasteles',
      slug: 'pasteles',
      description: 'Pasteles personalizados para ocasiones especiales',
      order: 3,
      isActive: true,
    },
    {
      name: 'Postres Fríos',
      slug: 'postres-frios',
      description: 'Cheesecakes, mousses y otros postres refrigerados',
      order: 4,
      isActive: true,
    },
    {
      name: 'Especiales',
      slug: 'especiales',
      description: 'Productos de temporada y ediciones limitadas',
      order: 5,
      isActive: true,
    },
  ];

  for (const category of categories) {
    const existing = await prisma.category.findUnique({
      where: { slug: category.slug },
    });

    if (!existing) {
      await prisma.category.create({ data: category });
      console.log(`  ✓ Created category: ${category.name}`);
    } else {
      console.log(`  ⚠ Category already exists: ${category.name}`);
    }
  }
}
