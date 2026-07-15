import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AdminRole } from '@prisma/client';
import { RolesGuard } from './roles.guard';

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: Reflector;

  const buildContext = (user?: { role: AdminRole }): ExecutionContext => {
    const request = { user };
    return {
      switchToHttp: () => ({ getRequest: () => request }),
      getHandler: () => jest.fn(),
      getClass: () => jest.fn(),
    } as unknown as ExecutionContext;
  };

  beforeEach(() => {
    reflector = new Reflector();
    guard = new RolesGuard(reflector);
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  it('allows the request through when the handler has no @Roles metadata', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);

    const context = buildContext({ role: AdminRole.MODERATOR });

    expect(guard.canActivate(context)).toBe(true);
  });

  it('allows the request through when @Roles metadata is an empty array', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([]);

    const context = buildContext({ role: AdminRole.MODERATOR });

    expect(guard.canActivate(context)).toBe(true);
  });

  it('allows a MODERATOR through an endpoint restricted to MODERATOR', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([AdminRole.MODERATOR]);

    const context = buildContext({ role: AdminRole.MODERATOR });

    expect(guard.canActivate(context)).toBe(true);
  });

  it('rejects a MODERATOR from an endpoint restricted to SUPER_ADMIN/ADMIN', () => {
    jest
      .spyOn(reflector, 'getAllAndOverride')
      .mockReturnValue([AdminRole.SUPER_ADMIN, AdminRole.ADMIN]);

    const context = buildContext({ role: AdminRole.MODERATOR });

    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });

  it('allows a SUPER_ADMIN through an endpoint restricted to SUPER_ADMIN/ADMIN', () => {
    jest
      .spyOn(reflector, 'getAllAndOverride')
      .mockReturnValue([AdminRole.SUPER_ADMIN, AdminRole.ADMIN]);

    const context = buildContext({ role: AdminRole.SUPER_ADMIN });

    expect(guard.canActivate(context)).toBe(true);
  });

  it('rejects the request when there is no authenticated user on the request at all', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([AdminRole.SUPER_ADMIN]);

    const context = buildContext(undefined);

    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });
});
