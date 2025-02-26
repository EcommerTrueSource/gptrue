import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

@Injectable()
export class MockAuthGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // Verificar se a rota é pública
    const isPublic = this.reflector.getAllAndOverride<boolean>('isPublic', [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    // Adicionar um usuário mock ao request
    const request = context.switchToHttp().getRequest();
    request.user = {
      id: 'dev-user-id',
      email: 'dev@example.com',
      firstName: 'Dev',
      lastName: 'User',
      roles: ['admin', 'user'],
    };

    // Verificar roles se necessário
    const requiredRoles = this.reflector.getAllAndOverride<string[]>('roles', [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    // Verificar se o usuário tem pelo menos uma das roles requeridas
    return requiredRoles.some(role => request.user.roles.includes(role));
  }
}
