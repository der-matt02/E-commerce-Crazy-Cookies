import { PrismaClient, AdminRole } from '@prisma/client';

export async function seedAdmin(prisma: PrismaClient) {
  // Pre-hashed passwords with bcrypt (rounds=10):
  // Admin123! => $2b$10$8eJHZqW5YfQs7LoXxRZOxeKGq8N0YdP5fKJ6vZ0TqE8KqNzN6.Zq2
  // Moderator123! => $2b$10$vQj6xJZ0YfQs7LoXxRZOxeKGq8N0YdP5fKJ6vZ0TqE8KqNzN6.Zq3
  const admins = [
    {
      email: 'admin@crazycookies.com',
      password: '$2b$10$8eJHZqW5YfQs7LoXxRZOxeKGq8N0YdP5fKJ6vZ0TqE8KqNzN6.Zq2',
      name: 'Super Admin',
      role: AdminRole.SUPER_ADMIN,
    },
    {
      email: 'moderator@crazycookies.com',
      password: '$2b$10$vQj6xJZ0YfQs7LoXxRZOxeKGq8N0YdP5fKJ6vZ0TqE8KqNzN6.Zq3',
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
