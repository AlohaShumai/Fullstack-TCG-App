import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';

interface JwtPayload {
  sub: string;
  email: string;
  role: string;
  username: string;
}

// Validates the long-lived refresh token (used only on POST /auth/refresh).
// passReqToCallback: true lets validate() receive the raw request so it can
// extract the token string and pass it to AuthService for bcrypt comparison.
@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(
  Strategy,
  'jwt-refresh',
) {
  constructor(private configService: ConfigService) {
    const secret = configService.get<string>('JWT_REFRESH_SECRET');
    if (!secret) {
      throw new Error('JWT_REFRESH_SECRET is not defined');
    }
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: secret,
      passReqToCallback: true,
    });
  }

  validate(req: Request, payload: JwtPayload) {
    const authHeader = req.get('Authorization');
    if (!authHeader) {
      throw new UnauthorizedException();
    }
    // Attach the raw refresh token so AuthService can bcrypt.compare it against the DB hash
    const refreshToken = authHeader.replace('Bearer ', '').trim();
    return {
      id: payload.sub,
      email: payload.email,
      role: payload.role,
      username: payload.username,
      refreshToken,
    };
  }
}
