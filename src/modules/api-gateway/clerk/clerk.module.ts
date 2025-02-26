import { Module, Global, DynamicModule } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ClerkService } from './clerk.service';
import { ClerkGuard } from './clerk.guard';
import { ClerkWebhookService } from './clerk-webhook.service';
import { ClerkConfig } from './interfaces/clerk-types.interface';

@Global()
@Module({})
export class ClerkModule {
  static forRoot(config?: Partial<ClerkConfig>): DynamicModule {
    return {
      module: ClerkModule,
      imports: [ConfigModule],
      providers: [
        {
          provide: 'CLERK_CONFIG',
          inject: [ConfigService],
          useFactory: (configService: ConfigService): ClerkConfig => {
            // Em ambiente de desenvolvimento, use valores mock se as variáveis não estiverem definidas
            const isDev = configService.get('NODE_ENV') === 'development';

            return {
              secretKey: config?.secretKey ||
                configService.get('CLERK_SECRET_KEY') ||
                (isDev ? 'sk_test_mock_key' : undefined),
              publishableKey: config?.publishableKey ||
                configService.get('CLERK_PUBLISHABLE_KEY') ||
                (isDev ? 'pk_test_mock_key' : undefined),
              webhookSecret: config?.webhookSecret ||
                configService.get('CLERK_WEBHOOK_SECRET') ||
                (isDev ? 'whsec_mock_webhook_secret' : undefined),
              jwtKey: config?.jwtKey ||
                configService.get('CLERK_JWT_KEY') ||
                (isDev ? 'jwt_mock_key' : undefined),
            };
          },
        },
        ClerkService,
        ClerkGuard,
        ClerkWebhookService,
      ],
      exports: [ClerkService, ClerkGuard, ClerkWebhookService],
    };
  }
}
