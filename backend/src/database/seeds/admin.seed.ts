import { PrismaClient, AdminRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';

export async function seedAdmin(prisma: PrismaClient) {
  const admins = [
    {
      email: 'admin@crazycookies.com',
      password: await bcrypt.hash('Admin123!', 10),
      name: 'Super Admin',
      role: AdminRole.SUPER_ADMIN,
    },
    {
      email: 'moderator@crazycookies.com',
      password: await bcrypt.hash('Moderator123!', 10),
      name: 'Moderator',
      role: AdminRole.MODERATOR,
    },
  ];

  for (const admin of admins) {
    const existing = await prisma.admin.findUnique({
      where: { email: admin.email },
    });

    if (!existing) {
      await prisma.admin.create({ data: admin });
      console.log(`  ✓ Created admin: ${admin.email}`);
    } else {
      console.log(`  ⚠ Admin already exists: ${admin.email}`);
    }
  }

  console.log('\n🔑 Admin credentials:');
  console.log('  Super Admin:');
  console.log('    Email: admin@crazycookies.com');
  console.log('    Password: Admin123!');
  console.log('  Moderator:');
  console.log('    Email: moderator@crazycookies.com');
  console.log('    Password: Moderator123!');
}
