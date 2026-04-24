import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

// Protects the token-refresh endpoint with the refresh token (long-lived JWT stored in an httpOnly cookie).
// Used only on POST /auth/refresh — everywhere else uses JwtAuthGuard with the short-lived access token.
// Wired to JwtRefreshStrategy via the 'jwt-refresh' strategy name.
@Injectable()
export class JwtRefreshGuard extends AuthGuard('jwt-refresh') {}
