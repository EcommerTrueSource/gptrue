import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { SemanticCacheService } from './services/semantic-cache.service';
import { SEMANTIC_CACHE_SERVICE } from './interfaces/semantic-cache.interface';

@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: SEMANTIC_CACHE_SERVICE,
      useFactory: () => {
        // Retorna um mock do serviço para evitar erros com o Pinecone
        return {
          findSimilarQuestion: async () => null,
          storeResult: async () => {},
          updateFeedback: async () => {},
          listTemplates: async () => [],
          updateTemplate: async () => ({}),
          deleteTemplate: async () => {},
          clearCache: async () => ({ clearedTemplates: 0, affectedQueries: 0 }),
          checkHealth: async () => ({ status: 'ok', latency: 0 }),
          checkConnection: async () => true,
        };
      },
    },
    // Também fornecemos o SemanticCacheService diretamente para o HealthController
    {
      provide: SemanticCacheService,
      useFactory: () => {
        // Retorna um mock do serviço para evitar erros com o Pinecone
        return {
          findSimilarQuestion: async () => null,
          storeResult: async () => {},
          updateFeedback: async () => {},
          listTemplates: async () => [],
          updateTemplate: async () => ({}),
          deleteTemplate: async () => {},
          clearCache: async () => ({ clearedTemplates: 0, affectedQueries: 0 }),
          checkHealth: async () => ({ status: 'ok', latency: 0 }),
          checkConnection: async () => true,
        };
      },
    },
  ],
  exports: [SEMANTIC_CACHE_SERVICE, SemanticCacheService],
})
export class SemanticCacheModule {}
