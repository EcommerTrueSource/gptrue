import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ClerkModule } from './clerk/clerk.module';
import { ClerkGuard } from './clerk/clerk.guard';
import { RolesGuard } from '../../common/guards/roles.guard';

@Module({
  imports: [
    ConfigModule,
    ClerkModule,
  ],
  providers: [
    ClerkGuard,
    RolesGuard,
  ],
  exports: [
    ClerkGuard,
    RolesGuard,
  ],
})
export class ApiGatewayModule {} 