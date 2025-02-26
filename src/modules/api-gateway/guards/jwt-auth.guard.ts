import { Injectable, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { verify } from 'jsonwebtoken';
import { Request } from 'express';

interface JwtPayload {
  sub: string;
  email: string;
  roles: string[];
  iat: number;
  exp: number;
}

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private configService: ConfigService) {
    super();
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const token = this.extractTokenFromHeader(request);

    if (!token) {
      throw new UnauthorizedException('Token não fornecido');
    }

    try {
      const secret = this.configService.get<string>('app.security.jwtSecret');
      if (!secret) {
        throw new Error('JWT secret não configurado');
      }

      const payload = verify(token, secret) as JwtPayload;

      // Validar expiração
      if (payload.exp && payload.exp < Date.now() / 1000) {
        throw new UnauthorizedException('Token expirado');
      }

      request['user'] = payload;
      return true;
    } catch (error: unknown) {
      const err = error as Error;
      throw new UnauthorizedException(`Token inválido: ${err.message}`);
    }
  }

  private extractTokenFromHeader(request: Request): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
}
