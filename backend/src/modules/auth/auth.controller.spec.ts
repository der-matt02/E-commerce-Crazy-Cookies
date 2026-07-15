import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { AdminRole } from '@prisma/client';

describe('AuthController', () => {
  let controller: AuthController;

  const mockAuthService = {
    login: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('login', () => {
    const loginDto = { email: 'admin@crazycookies.com', password: 'Admin123!' };

    it('should delegate to AuthService.login with the given dto', async () => {
      const expectedResult = {
        token: 'signed-jwt-token',
        admin: {
          id: 'admin-1',
          email: loginDto.email,
          name: 'Admin Test',
          role: AdminRole.ADMIN,
        },
      };
      mockAuthService.login.mockResolvedValue(expectedResult);

      const result = await controller.login(loginDto);

      expect(mockAuthService.login).toHaveBeenCalledWith(loginDto);
      expect(mockAuthService.login).toHaveBeenCalledTimes(1);
      expect(result).toEqual(expectedResult);
    });

    it('should propagate UnauthorizedException thrown by the service', async () => {
      mockAuthService.login.mockRejectedValue(
        new UnauthorizedException('Credenciales incorrectas'),
      );

      await expect(controller.login(loginDto)).rejects.toThrow(UnauthorizedException);
      await expect(controller.login(loginDto)).rejects.toThrow('Credenciales incorrectas');
    });

    it('should propagate any other error raised by the service without altering it', async () => {
      mockAuthService.login.mockRejectedValue(new ForbiddenException('blocked'));

      await expect(controller.login(loginDto)).rejects.toThrow(ForbiddenException);
    });

    it('should not catch or transform errors on its own', async () => {
      const dbError = new Error('unexpected failure');
      mockAuthService.login.mockRejectedValue(dbError);

      await expect(controller.login(loginDto)).rejects.toBe(dbError);
    });
  });
});
