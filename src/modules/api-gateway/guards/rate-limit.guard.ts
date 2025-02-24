import { Injectable, ExecutionContext, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RateLimit } from 'rate-limiter-flexible';

@Injectable()
export class RateLimitGuard {
  private limiter: RateLimit;

  constructor(private configService: ConfigService) {
    const windowMs = this.configService.get<number>('app.rateLimit.windowMs');
    const max = this.configService.get<number>('app.rateLimit.max');

    this.limiter = new RateLimit({
      points: max,
      duration: windowMs / 1000, // Converter para segundos
      blockDuration: windowMs / 1000, // Bloquear pelo mesmo período
    });
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const key = request.ip;

    try {
      await this.limiter.consume(key);
      return true;
    } catch (error) {
      throw new HttpException(
        'Muitas requisições. Tente novamente mais tarde.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }
} 