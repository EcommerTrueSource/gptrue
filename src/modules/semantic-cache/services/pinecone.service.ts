import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Pinecone, RecordMetadata, PineconeRecord } from '@pinecone-database/pinecone';
import { CacheTemplate } from '../interfaces/cache.interface';

@Injectable()
export class PineconeService implements OnModuleInit {
  private readonly pinecone: Pinecone;
  private readonly namespace = 'gptrue-cache';

  constructor(private readonly configService: ConfigService) {
    this.pinecone = new Pinecone({
      apiKey: this.configService.get<string>('pinecone.apiKey'),
    });
  }

  async onModuleInit() {
    // Não é mais necessário inicializar o Pinecone, pois isso é feito no construtor
  }

  async upsertTemplate(template: CacheTemplate): Promise<void> {
    try {
      const index = this.pinecone.Index(this.configService.get<string>('pinecone.indexName'));

      const record: PineconeRecord<RecordMetadata> = {
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
      };

      await index.upsert([record]);
    } catch (error) {
      throw new Error(`Erro ao inserir template no Pinecone: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    }
  }

  async findSimilarTemplates(embedding: number[], threshold: number = 0.85, limit: number = 1) {
    try {
      const index = this.pinecone.Index(this.configService.get<string>('pinecone.indexName'));

      const queryResponse = await index.query({
        vector: embedding,
        topK: limit,
        includeMetadata: true,
      });

      return queryResponse.matches
        .filter(match => match.score >= threshold)
        .map(match => ({
          id: match.id,
          similarity: match.score,
          metadata: match.metadata,
        }));
    } catch (error) {
      throw new Error(`Erro ao buscar templates similares: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    }
  }

  async deleteTemplate(id: string): Promise<void> {
    try {
      const index = this.pinecone.Index(this.configService.get<string>('pinecone.indexName'));

      await index.deleteOne(id);
    } catch (error) {
      throw new Error(`Erro ao deletar template: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    }
  }
}
