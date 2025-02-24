import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ClerkService } from './clerk.service';
import { ClerkGuard } from './clerk.guard';
import { ClerkStrategy } from './clerk.strategy';
import { ClerkController } from './clerk.controller';

@Module({
  imports: [ConfigModule],
  controllers: [ClerkController],
  providers: [ClerkService, ClerkGuard, ClerkStrategy],
  exports: [ClerkService, ClerkGuard],
})
export class ClerkModule {} 