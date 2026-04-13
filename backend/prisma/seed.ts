/// <reference types="node" />
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const existing = await prisma.admin.findUnique({
    where: { email: 'admin@crazycookies.com' },
  });

  if (existing) {
    console.log('Admin ya existe, omitiendo...');
    return;
  }

  const password = await bcrypt.hash('Admin123!', 10);

  await prisma.admin.create({
    data: {
      email: 'admin@crazycookies.com',
      password,
      name: 'Admin',
      role: 'SUPER_ADMIN',
      isActive: true,
    },
  });

  console.log('Admin creado: admin@crazycookies.com / Admin123!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
