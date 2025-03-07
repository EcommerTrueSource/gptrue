import { LoggerService } from '@nestjs/common';
import * as winston from 'winston';

/**
 * Implementação personalizada do LoggerService do NestJS usando o Winston
 */
export class WinstonLogger implements LoggerService {
  constructor(private readonly logger: winston.Logger) {}

  log(message: string, context?: string): void {
    this.logger.info(message, { context });
  }

  error(message: string, trace?: string, context?: string): void {
    this.logger.error(message, { trace, context });
  }

  warn(message: string, context?: string): void {
    this.logger.warn(message, { context });
  }

  debug(message: string, context?: string): void {
    this.logger.debug(message, { context });
  }

  verbose(message: string, context?: string): void {
    this.logger.verbose(message, { context });
  }
}
