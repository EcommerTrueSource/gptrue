import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PineconeClient } from '@pinecone-database/pinecone';
import { CacheTemplate } from '../interfaces/cache-template.interface';

@Injectable()
export class PineconeService implements OnModuleInit {
  private readonly pinecone: PineconeClient;
  private readonly namespace = 'gptrue-cache';

  constructor(private readonly configService: ConfigService) {
    this.pinecone = new PineconeClient();
  }

  async onModuleInit() {
    await this.initializePinecone();
  }

  private async initializePinecone() {
    try {
      await this.pinecone.init({
        environment: this.configService.get<string>('pinecone.environment'),
        apiKey: this.configService.get<string>('pinecone.apiKey'),
      });
    } catch (error) {
      throw new Error(`Erro ao inicializar Pinecone: ${error.message}`);
    }
  }

  async upsertTemplate(template: CacheTemplate): Promise<void> {
    try {
      const index = this.pinecone.Index(this.configService.get<string>('pinecone.indexName'));
      
      await index.upsert({
        upsertRequest: {
          vectors: [{
            id: template.id,
            values: template.questionEmbedding,
            metadata: {
              question: template.question,
              response: template.response,
              query: template.query,
              createdAt: template.metadata.createdAt.toISOString(),
              updatedAt: template.metadata.updatedAt.toISOString(),
              version: template.metadata.version,
              sourceTables: template.metadata.sourceTables,
              ttl: template.ttl?.toISOString(),
            },
          }],
          namespace: this.namespace,
        },
      });
    } catch (error) {
      throw new Error(`Erro ao inserir template no Pinecone: ${error.message}`);
    }
  }

  async findSimilarTemplates(embedding: number[], threshold: number = 0.85, limit: number = 1) {
    try {
      const index = this.pinecone.Index(this.configService.get<string>('pinecone.indexName'));
      
      const queryResponse = await index.query({
        queryRequest: {
          vector: embedding,
          topK: limit,
          includeMetadata: true,
          namespace: this.namespace,
        },
      });

      return queryResponse.matches
        .filter(match => match.score >= threshold)
        .map(match => ({
          id: match.id,
          similarity: match.score,
          metadata: match.metadata,
        }));
    } catch (error) {
      throw new Error(`Erro ao buscar templates similares: ${error.message}`);
    }
  }

  async deleteTemplate(id: string): Promise<void> {
    try {
      const index = this.pinecone.Index(this.configService.get<string>('pinecone.indexName'));
      
      await index.delete1({
        ids: [id],
        namespace: this.namespace,
      });
    } catch (error) {
      throw new Error(`Erro ao deletar template: ${error.message}`);
    }
  }
} 