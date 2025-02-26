import { Injectable, ExecutionContext, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RateLimiterMemory, RateLimiterRes } from 'rate-limiter-flexible';
import { Request } from 'express';

@Injectable()
export class RateLimitGuard {
  private limiter: RateLimiterMemory;

  constructor(private configService: ConfigService) {
    const windowMs = this.configService.get<number>('app.rateLimit.windowMs') || 60000; // 1 minuto padrão
    const max = this.configService.get<number>('app.rateLimit.max') || 100; // 100 requisições padrão

    this.limiter = new RateLimiterMemory({
      points: max,
      duration: windowMs / 1000, // Converter para segundos
      blockDuration: windowMs / 1000, // Bloquear pelo mesmo período
    });
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const key = this.getClientKey(request);

    try {
      await this.limiter.consume(key);
      return true;
    } catch (error: unknown) {
      if (error instanceof RateLimiterRes) {
        const retryAfter = Math.round(error.msBeforeNext / 1000) || 1;
        throw new HttpException(
          {
            message: 'Muitas requisições. Tente novamente mais tarde.',
            retryAfter,
          },
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }
      // Se não for um erro de rate limit, logar e retornar erro genérico
      const err = error as Error;
      throw new HttpException(
        `Erro no rate limit: ${err.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  private getClientKey(request: Request): string {
    // Usar X-Forwarded-For se disponível (para casos com proxy)
    const clientIp = request.headers['x-forwarded-for'] || request.ip;
    const userId = (request['user']?.sub as string) || 'anonymous';

    // Combinar IP e ID do usuário para melhor granularidade
    return `${clientIp}:${userId}`;
  }
}
