import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../users/users.service';
import * as bcrypt from 'bcrypt';

// Standard JWT payload fields. 'sub' is the JWT spec's name for the subject (user ID).
interface TokenPayload {
  sub: string;
  email: string;
  role: string;
  username: string;
}

export interface Tokens {
  accessToken: string;
  refreshToken: string;
}

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async register(
    email: string,
    password: string,
    username: string,
  ): Promise<Tokens> {
    // Guard against duplicate email or username before creating the user
    const existingUser = await this.usersService.findByEmail(email);
    if (existingUser) {
      throw new UnauthorizedException('Email already registered');
    }

    const existingUsername = await this.usersService.findByUsername(username);
    if (existingUsername) {
      throw new UnauthorizedException('Username already taken');
    }

    const user = await this.usersService.create(email, password, username);
    const tokens = await this.generateTokens({
      sub: user.id,
      email: user.email,
      role: user.role,
      username: user.username,
    });

    // Store a bcrypt hash of the refresh token so raw tokens are never saved in the DB
    await this.usersService.updateRefreshToken(user.id, tokens.refreshToken);
    return tokens;
  }

  async login(email: string, password: string): Promise<Tokens> {
    const user = await this.usersService.findByEmail(email);
    if (!user) {
      // Return same message as wrong password to avoid leaking whether the email exists
      throw new UnauthorizedException('Invalid credentials');
    }

    const passwordValid = await bcrypt.compare(password, user.password);
    if (!passwordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const tokens = await this.generateTokens({
      sub: user.id,
      email: user.email,
      role: user.role,
      username: user.username,
    });

    await this.usersService.updateRefreshToken(user.id, tokens.refreshToken);
    return tokens;
  }

  async refresh(userId: string, refreshToken: string): Promise<Tokens> {
    const user = await this.usersService.findById(userId);
    if (!user || !user.refreshToken) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    // Compare the incoming raw token against the stored hash
    const tokenValid = await bcrypt.compare(refreshToken, user.refreshToken);
    if (!tokenValid) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const tokens = await this.generateTokens({
      sub: user.id,
      email: user.email,
      role: user.role,
      username: user.username,
    });

    await this.usersService.updateRefreshToken(user.id, tokens.refreshToken);
    return tokens;
  }

  // Logout: wipe the stored refresh token so it can't be reused
  async logout(userId: string): Promise<void> {
    await this.usersService.updateRefreshToken(userId, null);
  }

  // Issues two tokens: a short-lived access token (15 min) and a long-lived refresh token (7 days).
  // Both are signed JWTs but with different secrets and TTLs.
  private async generateTokens(payload: TokenPayload): Promise<Tokens> {
    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: this.configService.get<string>('JWT_SECRET'),
        expiresIn: '15m',
      }),
      this.jwtService.signAsync(payload, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
        expiresIn: '7d',
      }),
    ]);

    return { accessToken, refreshToken };
  }
}
