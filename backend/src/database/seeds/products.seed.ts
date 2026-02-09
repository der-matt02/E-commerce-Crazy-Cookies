import { PrismaClient } from '@prisma/client';

export async function seedProducts(prisma: PrismaClient) {
  // Get categories
  const galletasCategory = await prisma.category.findUnique({
    where: { slug: 'galletas' },
  });
  const browniesCategory = await prisma.category.findUnique({
    where: { slug: 'brownies' },
  });
  const pastelesCategory = await prisma.category.findUnique({
    where: { slug: 'pasteles' },
  });

  if (!galletasCategory || !browniesCategory || !pastelesCategory) {
    console.error('  ❌ Categories not found. Please seed categories first.');
    return;
  }

  const products = [
    // Galletas
    {
      name: 'Galletas de Chocolate Chip',
      slug: 'galletas-chocolate-chip',
      description:
        'Clásicas galletas con chips de chocolate semi-amargo. Crujientes por fuera, suaves por dentro.',
      price: 15000,
      categoryId: galletasCategory.id,
      isActive: true,
      inventory: {
        stockAvailable: 50,
        stockReserved: 0,
        stockMinimum: 10,
      },
    },
    {
      name: 'Galletas de Avena y Pasas',
      slug: 'galletas-avena-pasas',
      description: 'Galletas saludables con avena integral, pasas y un toque de canela.',
      price: 12000,
      categoryId: galletasCategory.id,
      isActive: true,
      inventory: {
        stockAvailable: 40,
        stockReserved: 0,
        stockMinimum: 10,
      },
    },
    {
      name: 'Galletas de Mantequilla',
      slug: 'galletas-mantequilla',
      description: 'Galletas suaves y delicadas con auténtico sabor a mantequilla.',
      price: 10000,
      categoryId: galletasCategory.id,
      isActive: true,
      inventory: {
        stockAvailable: 60,
        stockReserved: 0,
        stockMinimum: 15,
      },
    },

    // Brownies
    {
      name: 'Brownie Clásico',
      slug: 'brownie-clasico',
      description:
        'Brownie de chocolate oscuro, húmedo y delicioso. Perfecto con helado.',
      price: 18000,
      categoryId: browniesCategory.id,
      isActive: true,
      inventory: {
        stockAvailable: 30,
        stockReserved: 0,
        stockMinimum: 8,
      },
    },
    {
      name: 'Brownie con Nueces',
      slug: 'brownie-nueces',
      description: 'Brownie con trozos de nueces pecanas tostadas.',
      price: 20000,
      categoryId: browniesCategory.id,
      isActive: true,
      inventory: {
        stockAvailable: 25,
        stockReserved: 0,
        stockMinimum: 5,
      },
    },

    // Pasteles
    {
      name: 'Pastel de Zanahoria (porción)',
      slug: 'pastel-zanahoria-porcion',
      description: 'Jugoso pastel de zanahoria con frosting de queso crema.',
      price: 12000,
      categoryId: pastelesCategory.id,
      isActive: true,
      inventory: {
        stockAvailable: 20,
        stockReserved: 0,
        stockMinimum: 5,
      },
    },
    {
      name: 'Pastel Red Velvet (porción)',
      slug: 'pastel-red-velvet-porcion',
      description: 'Clásico pastel red velvet con frosting de queso crema.',
      price: 14000,
      categoryId: pastelesCategory.id,
      isActive: true,
      inventory: {
        stockAvailable: 15,
        stockReserved: 0,
        stockMinimum: 5,
      },
    },
  ];

  for (const productData of products) {
    const { inventory, ...product } = productData;

    const existing = await prisma.product.findUnique({
      where: { slug: product.slug },
    });

    if (!existing) {
      const createdProduct = await prisma.product.create({
        data: {
          ...product,
          inventory: {
            create: inventory,
          },
        },
      });
      console.log(`  ✓ Created product: ${createdProduct.name}`);
    } else {
      console.log(`  ⚠ Product already exists: ${product.name}`);
    }
  }
}
