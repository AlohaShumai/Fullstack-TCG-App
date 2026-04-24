import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { UsersModule } from '../users/users.module';
import { JwtStrategy } from './strategies/jwt.strategy';
import { JwtRefreshStrategy } from './strategies/jwt-refresh.strategy';

// Auth module — handles registration, login, logout, and token refresh.
// JwtModule is registered with no options here because each strategy reads its own
// secret from ConfigService at runtime rather than using a shared module-level secret.
// UsersModule is imported so AuthService can look up users during login.
@Module({
  imports: [PassportModule, JwtModule.register({}), UsersModule],
  controllers: [AuthController],
  // Both JWT strategies must be listed as providers so Passport can discover them
  providers: [AuthService, JwtStrategy, JwtRefreshStrategy],
  exports: [AuthService],
})
export class AuthModule {}
