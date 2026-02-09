import { PrismaClient } from '@prisma/client';
import { seedAdmin } from './admin.seed';
import { seedCategories } from './categories.seed';
import { seedProducts } from './products.seed';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding...');

  try {
    // Seed admin
    console.log('\n👤 Seeding admin users...');
    await seedAdmin(prisma);

    // Seed categories
    console.log('\n📁 Seeding categories...');
    await seedCategories(prisma);

    // Seed products
    console.log('\n🍪 Seeding products...');
    await seedProducts(prisma);

    console.log('\n✅ Database seeding completed successfully!');
  } catch (error) {
    console.error('\n❌ Error during seeding:', error);
    throw error;
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
