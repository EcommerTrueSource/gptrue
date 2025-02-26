import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ClerkService } from './clerk.service';
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
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    try {
      const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
        context.getHandler(),
        context.getClass(),
      ]);

      if (isPublic) {
        return true;
      }

      const request = context.switchToHttp().getRequest<Request>();
      const token = this.extractTokenFromHeader(request);

      if (!token) {
        throw new UnauthorizedException('Token não fornecido');
      }

      const user = await this.clerkService.validateToken(token);
      request['user'] = user;

      const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
        context.getHandler(),
        context.getClass(),
      ]);

      if (!requiredRoles) {
        return true;
      }

      const hasRequiredRole = this.validateRoles(user, requiredRoles);

      if (!hasRequiredRole) {
        this.logger.warn(`Acesso negado para usuário ${user.id} - Roles requeridas: ${requiredRoles.join(', ')}`);
        throw new UnauthorizedException('Acesso não autorizado para este recurso');
      }

      return true;
    } catch (error) {
      this.logger.error('Erro na autenticação', error);
      throw error;
    }
  }

  private extractTokenFromHeader(request: Request): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }

  private validateRoles(user: ClerkUser, requiredRoles: string[]): boolean {
    return requiredRoles.some(role => user.roles.includes(role));
  }
}
