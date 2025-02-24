import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { ConfigService } from '@nestjs/config';
import * as winston from 'winston';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private logger: winston.Logger;

  constructor(private readonly configService: ConfigService) {
    this.logger = winston.createLogger({
      level: this.configService.get('app.logging.level'),
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json(),
      ),
      transports: [
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.colorize(),
            winston.format.simple(),
          ),
        }),
      ],
    });
  }

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { method, url, body, headers } = request;
    const startTime = Date.now();

    return next.handle().pipe(
      tap({
        next: (data: any) => {
          const endTime = Date.now();
          this.logger.info('Request completed', {
            method,
            url,
            body,
            headers: this.sanitizeHeaders(headers),
            responseTime: `${endTime - startTime}ms`,
            response: data,
          });
        },
        error: (error: any) => {
          const endTime = Date.now();
          this.logger.error('Request failed', {
            method,
            url,
            body,
            headers: this.sanitizeHeaders(headers),
            responseTime: `${endTime - startTime}ms`,
            error: {
              message: error.message,
              stack: error.stack,
            },
          });
        },
      }),
    );
  }

  private sanitizeHeaders(headers: any): any {
    const sanitized = { ...headers };
    delete sanitized.authorization;
    return sanitized;
  }
} 