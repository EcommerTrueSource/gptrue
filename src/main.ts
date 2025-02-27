import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import { ValidationPipe } from '@nestjs/common';
import * as winston from 'winston';
import helmet from 'helmet';
import compression from 'compression';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { Logger } from '@nestjs/common';
import { setupSwagger } from './config/swagger.config';
import { SensitiveDataInterceptor } from './common/interceptors/sensitive-data.interceptor';

async function bootstrap(): Promise<void> {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  // Configurações básicas
  app.setGlobalPrefix('api');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Segurança
  app.use(helmet());
  app.enableCors({
    origin: process.env.FRONTEND_URL || '*',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
  });

  // Compressão
  app.use(compression());

  // Filtro global de exceções
  app.useGlobalFilters(new HttpExceptionFilter());

  // Configurar interceptor global
  app.useGlobalInterceptors(new SensitiveDataInterceptor());

  // Configuração de logging
  const winstonLogger = winston.createLogger({
    level: configService.get<string>('app.logging.level') ?? 'info',
    levels: winston.config.npm.levels,
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.json()
    ),
    transports: [
      new winston.transports.Console({
        format: winston.format.combine(
          winston.format.colorize(),
          winston.format.timestamp(),
          winston.format.printf(({ timestamp, level, message, ...meta }) => {
            return `[${timestamp}] ${level}: ${message} ${Object.keys(meta).length ? JSON.stringify(meta) : ''}`;
          })
        ),
      }),
    ],
  });

  // Configuração do logger global
  app.useLogger(winstonLogger);

  // Configuração do Swagger
  setupSwagger(app);

  // Inicialização do servidor
  const port = configService.get<number>('app.port') ?? 3000;
  await app.listen(port, '0.0.0.0');
  logger.log(`Aplicação iniciada na porta ${port}`);
  logger.log(`Ambiente: ${configService.get<string>('app.environment') ?? 'development'}`);
  logger.log(`Documentação da API disponível em: http://localhost:${port}/api/docs`);
}

// Tratamento de erros não capturados
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

process.on('uncaughtException', error => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

void bootstrap();
