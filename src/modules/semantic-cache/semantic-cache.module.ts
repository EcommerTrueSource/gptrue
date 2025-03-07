import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { SemanticCacheService } from './services/semantic-cache.service';
import { SEMANTIC_CACHE_SERVICE, ISemanticCacheService } from './interfaces/semantic-cache.interface';

@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: SEMANTIC_CACHE_SERVICE,
      useFactory: (configService: ConfigService) => {
        const pineconeApiKey = configService.get<string>('pinecone.apiKey');

        // Se não tiver chave de API do Pinecone, usar mock
        if (!pineconeApiKey) {
          console.log('Aviso: Chave de API do Pinecone não encontrada. Usando serviço mock para desenvolvimento.');
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
        }

        // Se tiver chave de API, usar o serviço real
        return new SemanticCacheService(configService);
      },
      inject: [ConfigService],
    },
    {
      provide: SemanticCacheService,
      useFactory: (configService: ConfigService) => {
        const pineconeApiKey = configService.get<string>('pinecone.apiKey');

        // Se não tiver chave de API do Pinecone, usar mock
        if (!pineconeApiKey) {
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
        }

        // Se tiver chave de API, usar o serviço real
        return new SemanticCacheService(configService);
      },
      inject: [ConfigService],
    },
  ],
  exports: [SEMANTIC_CACHE_SERVICE, SemanticCacheService],
})
export class SemanticCacheModule {}
