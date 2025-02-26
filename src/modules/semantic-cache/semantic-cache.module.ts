import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { SemanticCacheService } from './services/semantic-cache.service';
import { SEMANTIC_CACHE_SERVICE } from './interfaces/semantic-cache.interface';

@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: SEMANTIC_CACHE_SERVICE,
      useClass: SemanticCacheService
    }
  ],
  exports: [SEMANTIC_CACHE_SERVICE],
})
export class SemanticCacheModule {}
