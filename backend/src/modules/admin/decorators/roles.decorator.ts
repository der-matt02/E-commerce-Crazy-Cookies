import { SetMetadata } from '@nestjs/common';
import { AdminRole } from '@prisma/client';

export const ROLES_KEY = 'roles';

/**
 * Restringe un endpoint a los roles de admin indicados. Debe usarse junto con
 * JwtAuthGuard + RolesGuard (JwtAuthGuard primero, para que exista `request.user`).
 * Un endpoint sin este decorator es accesible por cualquier admin autenticado.
 */
export const Roles = (...roles: AdminRole[]) => SetMetadata(ROLES_KEY, roles);
