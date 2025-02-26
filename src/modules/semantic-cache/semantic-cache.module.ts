import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { SemanticCacheService } from './services/semantic-cache.service';

@Module({
  imports: [ConfigModule],
  providers: [SemanticCacheService],
  exports: [SemanticCacheService],
})
export class SemanticCacheModule {}
