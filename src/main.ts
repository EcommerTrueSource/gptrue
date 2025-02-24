import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import { ValidationPipe } from '@nestjs/common';
import * as winston from 'winston';
import helmet from 'helmet';
import * as compression from 'compression';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { Logger } from '@nestjs/common';

async function bootstrap() {
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
    origin: configService.get('CORS_ORIGIN'),
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    credentials: true,
  });

  // Compressão
  app.use(compression());

  // Filtro global de exceções
  app.useGlobalFilters(new HttpExceptionFilter());

  // Configuração de logging
  const loggerWinston = winston.createLogger({
    level: configService.get('app.logging.level'),
    format: winston.format.json(),
    transports: [
      new winston.transports.Console({
        format: winston.format.combine(
          winston.format.colorize(),
          winston.format.simple()
        ),
      }),
    ],
  });

  // Inicialização do servidor
  const port = configService.get('app.port');
  await app.listen(port);
  logger.log(`Aplicação iniciada na porta ${port}`);
  logger.log(`Ambiente: ${configService.get('app.environment')}`);
  logger.log(`Documentação da API disponível em: http://localhost:${port}/api/docs`);
}
bootstrap();