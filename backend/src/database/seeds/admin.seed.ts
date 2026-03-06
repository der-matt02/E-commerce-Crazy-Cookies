import { PrismaClient, AdminRole } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

export async function seedAdmin(prisma: PrismaClient) {
  const admins = [
    {
      email: 'admin@crazycookies.com',
      plainPassword: 'Admin123!',
      name: 'Super Admin',
      role: AdminRole.SUPER_ADMIN,
    },
    {
      email: 'moderator@crazycookies.com',
      plainPassword: 'Moderator123!',
      name: 'Moderator',
      role: AdminRole.MODERATOR,
    },
  ];

  for (const admin of admins) {
    const password = await bcrypt.hash(admin.plainPassword, 10);
    await prisma.admin.upsert({
      where: { email: admin.email },
      update: { password, name: admin.name, role: admin.role, isActive: true },
      create: { email: admin.email, password, name: admin.name, role: admin.role },
    });
    console.log(`  ✓ Upserted admin: ${admin.email}`);
  }

  console.log('\n🔑 Admin credentials:');
  console.log('  Super Admin:');
  console.log('    Email: admin@crazycookies.com');
  console.log('    Password: Admin123!');
  console.log('  Moderator:');
  console.log('    Email: moderator@crazycookies.com');
  console.log('    Password: Moderator123!');
}
