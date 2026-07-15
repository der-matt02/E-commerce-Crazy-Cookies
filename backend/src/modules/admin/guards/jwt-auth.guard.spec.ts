import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { JwtAuthGuard } from './jwt-auth.guard';

describe('JwtAuthGuard', () => {
  let guard: JwtAuthGuard;

  const mockConfigService = {
    get: jest.fn().mockReturnValue('test-jwt-secret'),
  } as unknown as ConfigService;

  const buildContext = (headers: Record<string, string | undefined>): ExecutionContext => {
    const request: { headers: Record<string, string | undefined>; user?: unknown } = {
      headers,
    };
    return {
      switchToHttp: () => ({
        getRequest: () => request,
      }),
    } as unknown as ExecutionContext;
  };

  beforeEach(() => {
    guard = new JwtAuthGuard(mockConfigService);
    jest.restoreAllMocks();
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  it('should throw UnauthorizedException when no authorization header is present', () => {
    const context = buildContext({});

    expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
    expect(() => guard.canActivate(context)).toThrow('Token no proporcionado');
  });

  it('should throw UnauthorizedException when the header does not use the Bearer scheme', () => {
    const context = buildContext({ authorization: 'Basic abc123' });

    expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
    expect(() => guard.canActivate(context)).toThrow('Token no proporcionado');
  });

  it('should throw UnauthorizedException when the Bearer token is malformed', () => {
    jest.spyOn(JwtService.prototype, 'verify').mockImplementation(() => {
      throw new Error('jwt malformed');
    });

    const context = buildContext({ authorization: 'Bearer not-a-real-token' });

    expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
    expect(() => guard.canActivate(context)).toThrow('Token inválido o expirado');
  });

  it('should throw UnauthorizedException when the token is expired', () => {
    class TokenExpiredError extends Error {
      constructor() {
        super('jwt expired');
        this.name = 'TokenExpiredError';
      }
    }
    jest.spyOn(JwtService.prototype, 'verify').mockImplementation(() => {
      throw new TokenExpiredError();
    });

    const context = buildContext({ authorization: 'Bearer expired-token' });

    expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
    expect(() => guard.canActivate(context)).toThrow('Token inválido o expirado');
  });

  it('should allow the request through and attach the decoded payload when the token is valid', () => {
    const decodedPayload = {
      sub: 'admin-1',
      email: 'admin@crazycookies.com',
      role: 'ADMIN',
      name: 'Admin Test',
    };
    jest.spyOn(JwtService.prototype, 'verify').mockReturnValue(decodedPayload as never);

    const request: { headers: Record<string, string>; user?: unknown } = {
      headers: { authorization: 'Bearer valid-token' },
    };
    const context = {
      switchToHttp: () => ({
        getRequest: () => request,
      }),
    } as unknown as ExecutionContext;

    const result = guard.canActivate(context);

    expect(result).toBe(true);
    expect(request.user).toEqual(decodedPayload);
  });

  it('should read the secret from ConfigService using the JWT_SECRET key', () => {
    expect(mockConfigService.get).toHaveBeenCalledWith('JWT_SECRET');
  });

  it('should reject a token signed with a different secret', () => {
    // Use a real JwtService with a different secret to produce a token,
    // then let the guard's internally-constructed JwtService (with the
    // configured secret) try to verify it — it must fail signature checks.
    const foreignJwtService = new JwtService({ secret: 'a-different-secret' });
    const foreignToken = foreignJwtService.sign({ sub: 'someone' });

    const realConfigService = {
      get: jest.fn().mockReturnValue('test-jwt-secret'),
    } as unknown as ConfigService;
    const realGuard = new JwtAuthGuard(realConfigService);

    const context = buildContext({ authorization: `Bearer ${foreignToken}` });

    expect(() => realGuard.canActivate(context)).toThrow(UnauthorizedException);
  });
});
