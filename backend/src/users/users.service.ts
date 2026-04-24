import {
  Injectable,
  ConflictException,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { User, Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { email } });
  }

  async findById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { id } });
  }

  async findByUsername(username: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { username } });
  }

  // Passwords are hashed with bcrypt (cost factor 10) before being stored
  async create(
    email: string,
    password: string,
    username: string,
    role: Role = 'USER',
  ): Promise<User> {
    const hashedPassword = await bcrypt.hash(password, 10);
    return this.prisma.user.create({
      data: { email, password: hashedPassword, username, role },
    });
  }

  // Refresh tokens are also hashed before storage — passing null clears it (logout)
  async updateRefreshToken(
    userId: string,
    refreshToken: string | null,
  ): Promise<void> {
    const hashedToken = refreshToken
      ? await bcrypt.hash(refreshToken, 10)
      : null;
    await this.prisma.user.update({
      where: { id: userId },
      data: { refreshToken: hashedToken },
    });
  }

  // Allow a user to change their own username; rejects if the new name is taken by someone else
  async updateUsername(userId: string, newUsername: string): Promise<User> {
    const existing = await this.prisma.user.findUnique({
      where: { username: newUsername },
    });
    if (existing && existing.id !== userId) {
      throw new ConflictException('Username is already taken');
    }
    return this.prisma.user.update({
      where: { id: userId },
      data: { username: newUsername },
    });
  }

  // Requires the current password for verification before updating — prevents session hijacking
  async updatePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
  ): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException();

    const valid = await bcrypt.compare(currentPassword, user.password);
    if (!valid) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    const hashed = await bcrypt.hash(newPassword, 10);
    await this.prisma.user.update({
      where: { id: userId },
      data: { password: hashed },
    });
  }

  // Cascade deletes in Prisma schema remove all collections, decks, and cards automatically
  async deleteUser(userId: string): Promise<void> {
    await this.prisma.user.delete({ where: { id: userId } });
  }
}
