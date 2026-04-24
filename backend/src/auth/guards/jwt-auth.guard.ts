import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

// Protects routes with the access token (short-lived JWT stored in memory on the frontend).
// Apply with @UseGuards(JwtAuthGuard) on any controller or route that requires login.
// NestJS Passport wires this to JwtStrategy automatically via the 'jwt' strategy name.
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
