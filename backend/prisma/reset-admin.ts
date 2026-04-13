/// <reference types="node" />
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const password = await bcrypt.hash('Admin123!', 10);

  const admin = await prisma.admin.upsert({
    where: { email: 'admin@crazycookies.com' },
    update: { password },
    create: {
      email: 'admin@crazycookies.com',
      password,
      name: 'Admin',
      role: 'SUPER_ADMIN',
      isActive: true,
    },
  });

  console.log(`Admin listo: ${admin.email}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
