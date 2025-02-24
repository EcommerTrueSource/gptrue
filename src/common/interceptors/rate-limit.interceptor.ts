import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { RateLimiterMemory } from 'rate-limiter-flexible';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class RateLimitInterceptor implements NestInterceptor {
  private rateLimiter: RateLimiterMemory;

  constructor(private configService: ConfigService) {
    const points = this.configService.get('app.rateLimiting.points');
    const duration = this.configService.get('app.rateLimiting.duration');

    this.rateLimiter = new RateLimiterMemory({
      points,
      duration,
    });
  }

  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<any>> {
    const request = context.switchToHttp().getRequest();
    const key = request.ip;

    try {
      await this.rateLimiter.consume(key);
      return next.handle();
    } catch (error) {
      throw new HttpException(
        'Muitas requisições. Por favor, tente novamente mais tarde.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }
} 