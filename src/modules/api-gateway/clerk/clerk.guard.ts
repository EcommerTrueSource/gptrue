import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  Logger,
  Inject,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ClerkService } from './clerk.service';
import { ConfigService } from '@nestjs/config';
import { IS_PUBLIC_KEY } from './decorators/public.decorator';
import { ROLES_KEY } from './decorators/roles.decorator';
import { Request } from 'express';
import { ClerkUser } from './interfaces/clerk-types.interface';

@Injectable()
export class ClerkGuard implements CanActivate {
  private readonly logger = new Logger(ClerkGuard.name);

  constructor(
    private readonly clerkService: ClerkService,
    private readonly reflector: Reflector,
    private readonly configService: ConfigService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Em ambiente de desenvolvimento, permitir acesso sem autenticação
    const isDev = this.configService.get('NODE_ENV') === 'development';
    if (isDev) {
      // Adicionar um usuário mock ao request
      const request = context.switchToHttp().getRequest();
      request.user = {
        id: 'dev-user-id',
        email: 'dev@example.com',
        firstName: 'Dev',
        lastName: 'User',
        roles: ['admin', 'user'],
      };
      return true;
    }

    // Verificar se a rota é pública
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;

    if (!authHeader) {
      return false;
    }

    try {
      const token = authHeader.split(' ')[1];
      const user = await this.clerkService.validateToken(token);

      if (!user) {
        return false;
      }

      request.user = user;

      const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
        context.getHandler(),
        context.getClass(),
      ]);

      if (!requiredRoles || requiredRoles.length === 0) {
        return true;
      }

      return this.validateRoles(user, requiredRoles);
    } catch (error) {
      this.logger.error('Erro na autenticação', error);
      return false;
    }
  }

  private validateRoles(user: ClerkUser, requiredRoles: string[]): boolean {
    if (!user.roles || user.roles.length === 0) {
      return false;
    }
    return requiredRoles.some((role) => user.roles.includes(role));
  }
}
