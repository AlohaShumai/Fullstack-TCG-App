import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';

interface RequestWithUser {
  user?: { role?: string };
}

@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<RequestWithUser>();

    if (request.user?.role !== 'ADMIN') {
      throw new ForbiddenException('Admin access required');
    }

    return true;
  }
}
