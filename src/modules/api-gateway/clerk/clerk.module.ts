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
          useFactory: (configService: ConfigService): ClerkConfig => ({
            secretKey: config?.secretKey || configService.getOrThrow('CLERK_SECRET_KEY'),
            publishableKey: config?.publishableKey || configService.getOrThrow('CLERK_PUBLISHABLE_KEY'),
            webhookSecret: config?.webhookSecret || configService.getOrThrow('CLERK_WEBHOOK_SECRET'),
            jwtKey: config?.jwtKey || configService.getOrThrow('CLERK_JWT_KEY'),
          }),
        },
        ClerkService,
        ClerkGuard,
        ClerkWebhookService,
      ],
      exports: [ClerkService, ClerkGuard, ClerkWebhookService],
    };
  }
}
