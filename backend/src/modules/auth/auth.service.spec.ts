import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { AuthService } from './auth.service';
import { PrismaService } from '@/database/prisma.service';
import { AdminRole } from '@prisma/client';

jest.mock('bcryptjs');

describe('AuthService', () => {
  let service: AuthService;

  const mockPrismaService = {
    admin: {
      findUnique: jest.fn(),
    },
  };

  const mockJwtService = {
    sign: jest.fn(),
  };

  const baseAdmin = {
    id: 'admin-1',
    email: 'admin@crazycookies.com',
    password: 'hashed-password',
    name: 'Admin Test',
    role: AdminRole.ADMIN,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('login', () => {
    it('should return a JWT token and admin data on valid credentials', async () => {
      mockPrismaService.admin.findUnique.mockResolvedValue(baseAdmin);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      mockJwtService.sign.mockReturnValue('signed-jwt-token');

      const result = await service.login({
        email: baseAdmin.email,
        password: 'plain-password',
      });

      expect(result).toEqual({
        token: 'signed-jwt-token',
        admin: {
          id: baseAdmin.id,
          email: baseAdmin.email,
          name: baseAdmin.name,
          role: baseAdmin.role,
        },
      });
    });

    it('should not leak the password hash in the response', async () => {
      mockPrismaService.admin.findUnique.mockResolvedValue(baseAdmin);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      mockJwtService.sign.mockReturnValue('signed-jwt-token');

      const result = await service.login({
        email: baseAdmin.email,
        password: 'plain-password',
      });

      expect(result.admin).not.toHaveProperty('password');
    });

    it('should query prisma with the provided email', async () => {
      mockPrismaService.admin.findUnique.mockResolvedValue(baseAdmin);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      mockJwtService.sign.mockReturnValue('signed-jwt-token');

      await service.login({ email: baseAdmin.email, password: 'plain-password' });

      expect(mockPrismaService.admin.findUnique).toHaveBeenCalledWith({
        where: { email: baseAdmin.email },
      });
    });

    it('should sign a JWT payload with sub, email, role and name', async () => {
      mockPrismaService.admin.findUnique.mockResolvedValue(baseAdmin);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      mockJwtService.sign.mockReturnValue('signed-jwt-token');

      await service.login({ email: baseAdmin.email, password: 'plain-password' });

      expect(mockJwtService.sign).toHaveBeenCalledWith({
        sub: baseAdmin.id,
        email: baseAdmin.email,
        role: baseAdmin.role,
        name: baseAdmin.name,
      });
    });

    it('should compare the provided password against the stored hash', async () => {
      mockPrismaService.admin.findUnique.mockResolvedValue(baseAdmin);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      mockJwtService.sign.mockReturnValue('signed-jwt-token');

      await service.login({ email: baseAdmin.email, password: 'plain-password' });

      expect(bcrypt.compare).toHaveBeenCalledWith('plain-password', baseAdmin.password);
    });

    it('should throw UnauthorizedException when the email does not exist', async () => {
      mockPrismaService.admin.findUnique.mockResolvedValue(null);

      await expect(
        service.login({ email: 'ghost@crazycookies.com', password: 'whatever' }),
      ).rejects.toThrow(UnauthorizedException);

      expect(bcrypt.compare).not.toHaveBeenCalled();
      expect(mockJwtService.sign).not.toHaveBeenCalled();
    });

    it('should throw UnauthorizedException with a generic message when the email does not exist', async () => {
      mockPrismaService.admin.findUnique.mockResolvedValue(null);

      await expect(
        service.login({ email: 'ghost@crazycookies.com', password: 'whatever' }),
      ).rejects.toThrow('Credenciales incorrectas');
    });

    it('should throw UnauthorizedException when the admin is inactive, even with the correct password', async () => {
      mockPrismaService.admin.findUnique.mockResolvedValue({
        ...baseAdmin,
        isActive: false,
      });

      await expect(
        service.login({ email: baseAdmin.email, password: 'plain-password' }),
      ).rejects.toThrow(UnauthorizedException);

      // Must reject before ever comparing the password.
      expect(bcrypt.compare).not.toHaveBeenCalled();
      expect(mockJwtService.sign).not.toHaveBeenCalled();
    });

    it('should throw UnauthorizedException when the password is incorrect', async () => {
      mockPrismaService.admin.findUnique.mockResolvedValue(baseAdmin);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(
        service.login({ email: baseAdmin.email, password: 'wrong-password' }),
      ).rejects.toThrow(UnauthorizedException);

      expect(mockJwtService.sign).not.toHaveBeenCalled();
    });

    it('should not leak whether the failure was due to email or password (same error message)', async () => {
      mockPrismaService.admin.findUnique.mockResolvedValueOnce(null);
      let unknownEmailError: unknown;
      try {
        await service.login({ email: 'ghost@crazycookies.com', password: 'x' });
      } catch (err) {
        unknownEmailError = err;
      }

      mockPrismaService.admin.findUnique.mockResolvedValueOnce(baseAdmin);
      (bcrypt.compare as jest.Mock).mockResolvedValueOnce(false);
      let wrongPasswordError: unknown;
      try {
        await service.login({ email: baseAdmin.email, password: 'wrong' });
      } catch (err) {
        wrongPasswordError = err;
      }

      expect((unknownEmailError as UnauthorizedException).message).toBe(
        (wrongPasswordError as UnauthorizedException).message,
      );
    });

    it('should propagate unexpected prisma errors instead of swallowing them', async () => {
      mockPrismaService.admin.findUnique.mockRejectedValue(new Error('DB connection lost'));

      await expect(
        service.login({ email: baseAdmin.email, password: 'plain-password' }),
      ).rejects.toThrow('DB connection lost');
    });
  });
});
