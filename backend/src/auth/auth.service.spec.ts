import { UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';

// bcrypt is a CommonJS module whose properties aren't configurable,
// so jest.spyOn can't override them. Mocking the whole module lets
// us control compare() return values per test.
jest.mock('bcrypt');

const mockUsersService = {
  findByEmail: jest.fn(),
  findById: jest.fn(),
  create: jest.fn(),
  updateRefreshToken: jest.fn(),
  findByUsername: jest.fn(),
};

const mockJwtService = {
  signAsync: jest.fn(),
};

const mockConfigService = {
  get: jest.fn(),
};

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(() => {
    service = new AuthService(
      mockUsersService as unknown as UsersService,
      mockJwtService as unknown as JwtService,
      mockConfigService as unknown as ConfigService,
    );
    jest.clearAllMocks();

    // Defaults that satisfy generateTokens() in every test
    mockConfigService.get.mockReturnValue('test-secret');
    mockJwtService.signAsync.mockResolvedValue('fake-token');
    mockUsersService.updateRefreshToken.mockResolvedValue(undefined);
  });

  // ------------------------------------------------------------------ //
  // register
  // ------------------------------------------------------------------ //
  describe('register', () => {
    it('should return tokens when registering a new email', async () => {
      mockUsersService.findByEmail.mockResolvedValue(null);
      mockUsersService.create.mockResolvedValue({
        id: 'user-1',
        email: 'user@test.com',
        username: 'user_1',
        role: 'USER',
      });

      const result = await service.register(
        'user@test.com',
        'password123',
        'user_1',
      );

      expect(result.accessToken).toBe('fake-token');
      expect(result.refreshToken).toBe('fake-token');
    });

    it('should call create with the provided username', async () => {
      mockUsersService.findByEmail.mockResolvedValue(null);
      mockUsersService.create.mockResolvedValue({
        id: 'user-1',
        email: 'user@test.com',
        username: 'cool_trainer',
        role: 'USER',
      });

      await service.register('user@test.com', 'password123', 'cool_trainer');

      expect(mockUsersService.create).toHaveBeenCalledWith(
        'user@test.com',
        'password123',
        'cool_trainer',
      );
    });

    it('should throw UnauthorizedException if email is already registered', async () => {
      mockUsersService.findByEmail.mockResolvedValue({
        id: 'user-1',
        email: 'user@test.com',
      });

      await expect(
        service.register('user@test.com', 'password123', 'user_1'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException if username is already taken', async () => {
      mockUsersService.findByEmail.mockResolvedValue(null);
      mockUsersService.findByUsername.mockResolvedValue({
        id: 'user-2',
        username: 'cool_trainer',
      });

      await expect(
        service.register('new@test.com', 'password123', 'cool_trainer'),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  // ------------------------------------------------------------------ //
  // login
  // ------------------------------------------------------------------ //
  describe('login', () => {
    it('should return tokens when credentials are valid', async () => {
      mockUsersService.findByEmail.mockResolvedValue({
        id: 'user-1',
        email: 'user@test.com',
        username: 'user_1',
        password: 'hashed-password',
        role: 'USER',
      });
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await service.login('user@test.com', 'password123');

      expect(result.accessToken).toBe('fake-token');
      expect(result.refreshToken).toBe('fake-token');
    });

    it('should throw UnauthorizedException when password is wrong', async () => {
      mockUsersService.findByEmail.mockResolvedValue({
        id: 'user-1',
        email: 'user@test.com',
        username: 'user_1',
        password: 'hashed-password',
        role: 'USER',
      });
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(
        service.login('user@test.com', 'wrongpassword'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException when email does not exist', async () => {
      mockUsersService.findByEmail.mockResolvedValue(null);

      await expect(
        service.login('nobody@test.com', 'password123'),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  // ------------------------------------------------------------------ //
  // refresh
  // ------------------------------------------------------------------ //
  describe('refresh', () => {
    it('should return new tokens when refresh token is valid', async () => {
      mockUsersService.findById.mockResolvedValue({
        id: 'user-1',
        email: 'user@test.com',
        username: 'user_1',
        role: 'USER',
        refreshToken: 'hashed-refresh-token',
      });
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await service.refresh('user-1', 'raw-refresh-token');

      expect(result.accessToken).toBe('fake-token');
      expect(result.refreshToken).toBe('fake-token');
    });

    it('should throw UnauthorizedException when refresh token is invalid', async () => {
      mockUsersService.findById.mockResolvedValue({
        id: 'user-1',
        email: 'user@test.com',
        username: 'user_1',
        role: 'USER',
        refreshToken: 'hashed-refresh-token',
      });
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(
        service.refresh('user-1', 'wrong-token'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException when user has no stored refresh token', async () => {
      mockUsersService.findById.mockResolvedValue({
        id: 'user-1',
        email: 'user@test.com',
        username: 'user_1',
        role: 'USER',
        refreshToken: null,
      });

      await expect(
        service.refresh('user-1', 'any-token'),
      ).rejects.toThrow(UnauthorizedException);
    });
  });
});

// ------------------------------------------------------------------ //
// UsersService - updatePassword
// ------------------------------------------------------------------ //
describe('UsersService - updatePassword', () => {
  const mockPrismaForUsers = {
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  };

  let usersService: UsersService;

  beforeEach(() => {
    usersService = new UsersService(
      mockPrismaForUsers as unknown as PrismaService,
    );
    jest.clearAllMocks();
    mockPrismaForUsers.user.update.mockResolvedValue({});
    (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-new-password');
  });

  it('should update the password when current password is correct', async () => {
    mockPrismaForUsers.user.findUnique.mockResolvedValue({
      id: 'user-1',
      password: 'hashed-current',
    });
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);

    await usersService.updatePassword('user-1', 'correctpass', 'newpassword123');

    expect(mockPrismaForUsers.user.update).toHaveBeenCalledTimes(1);
    expect(mockPrismaForUsers.user.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'user-1' } }),
    );
  });

  it('should throw UnauthorizedException when current password is wrong', async () => {
    mockPrismaForUsers.user.findUnique.mockResolvedValue({
      id: 'user-1',
      password: 'hashed-current',
    });
    (bcrypt.compare as jest.Mock).mockResolvedValue(false);

    await expect(
      usersService.updatePassword('user-1', 'wrongpass', 'newpassword123'),
    ).rejects.toThrow(UnauthorizedException);

    expect(mockPrismaForUsers.user.update).not.toHaveBeenCalled();
  });
});
