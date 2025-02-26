import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { ClerkUser } from 'src/modules/api-gateway/clerk/interfaces/clerk-types.interface';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.get<string[]>('roles', context.getHandler());
    if (!requiredRoles) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest<Request & { user: ClerkUser }>();
    if (!user || !user.roles) {
      return false;
    }

    return requiredRoles.some(role => user.roles.includes(role));
  }
}
