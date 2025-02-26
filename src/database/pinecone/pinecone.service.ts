import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Pinecone, PineconeRecord, RecordMetadata } from '@pinecone-database/pinecone';
import { CacheTemplate } from './interfaces/pinecone.interface';

@Injectable()
export class PineconeService implements OnModuleInit {
  private readonly logger = new Logger(PineconeService.name);
  private pinecone: Pinecone;
  private indexName: string;
  private namespace: string;
  private dimension: number;
  private ttlEnabled: boolean;
  private ttlDays: number;

  constructor(private configService: ConfigService) {
    this.indexName = this.configService.get<string>('pinecone.indexName') || 'gptrue-index';
    this.namespace = this.configService.get<string>('pinecone.namespace') || 'default';
    this.dimension = this.configService.get<number>('pinecone.dimension') || 1536;
    this.ttlEnabled = this.configService.get<boolean>('pinecone.ttl.enabled') || false;
    this.ttlDays = this.configService.get<number>('pinecone.ttl.days') || 30;
  }

  async onModuleInit() {
    await this.initializePinecone();
  }

  /**
   * Inicializa o cliente Pinecone
   */
  private async initializePinecone() {
    try {
      this.pinecone = new Pinecone({
        apiKey: this.configService.get<string>('pinecone.apiKey') || '',
      });
      this.logger.log('Pinecone inicializado com sucesso');
    } catch (error: unknown) {
      const err = error as Error;
      this.logger.error(`Erro ao inicializar Pinecone: ${err.message}`, err.stack);
      throw new Error(`Erro ao inicializar Pinecone: ${err.message}`);
    }
  }

  /**
   * Insere um template no Pinecone
   * @param template Template a ser inserido
   * @returns ID do template inserido
   */
  async upsertTemplate(template: CacheTemplate): Promise<string> {
    try {
      const index = this.pinecone.Index(this.indexName);
      const metadata = {
        question: template.question,
        query: template.query || '',
        response: template.response,
        createdAt: template.metadata.createdAt.toISOString(),
        updatedAt: template.metadata.updatedAt.toISOString(),
        version: template.metadata.version,
        executionTimeMs: template.metadata.executionTimeMs,
        sourceTables: template.metadata.sourceTables.join(','),
        positive: template.feedback.positive,
        negative: template.feedback.negative,
        needsReview: template.feedback.needsReview,
      };

      const record: PineconeRecord<RecordMetadata> = {
        id: template.id,
        values: template.questionEmbedding,
        metadata,
      };

      if (this.ttlEnabled) {
        record.metadata.ttl = new Date(Date.now() + this.ttlDays * 24 * 60 * 60 * 1000).toISOString();
      }

      await index.upsert([record]);

      this.logger.log(`Template inserido com sucesso: ${template.id}`);
      return template.id;
    } catch (error: unknown) {
      const err = error as Error;
      this.logger.error(`Erro ao inserir template no Pinecone: ${err.message}`, err.stack);
      throw new Error(`Erro ao inserir template no Pinecone: ${err.message}`);
    }
  }

  /**
   * Busca templates similares no Pinecone
   * @param embedding Embedding da pergunta
   * @param similarityThreshold Limiar de similaridade
   * @param topK Número máximo de resultados
   * @returns Templates similares
   */
  async findSimilarTemplates(
    embedding: number[],
    similarityThreshold: number = 0.85,
    topK: number = 1,
  ): Promise<{ id: string; score: number; metadata: any }[]> {
    try {
      const index = this.pinecone.Index(this.indexName);
      const queryResponse = await index.query({
        vector: embedding,
        topK,
        includeMetadata: true,
      });

      const matches = queryResponse.matches
        ?.filter(match => match.score >= similarityThreshold)
        .map(match => ({
          id: match.id,
          score: match.score,
          metadata: match.metadata,
        })) || [];

      this.logger.debug(`Encontrados ${matches.length} templates similares`);
      return matches;
    } catch (error: unknown) {
      const err = error as Error;
      this.logger.error(`Erro ao buscar templates similares: ${err.message}`, err.stack);
      throw new Error(`Erro ao buscar templates similares: ${err.message}`);
    }
  }

  /**
   * Atualiza um template no Pinecone
   * @param id ID do template
   * @param updates Atualizações a serem aplicadas
   * @returns Confirmação de atualização
   */
  async updateTemplate(id: string, updates: Partial<CacheTemplate>): Promise<boolean> {
    try {
      const index = this.pinecone.Index(this.indexName);
      const fetchResponse = await index.fetch([id]);

      const vector = fetchResponse.records[id];
      if (!vector) {
        throw new Error(`Template não encontrado: ${id}`);
      }

      const currentMetadata = vector.metadata;
      const updatedMetadata = {
        ...currentMetadata,
        updatedAt: new Date().toISOString(),
        ...(updates.feedback && {
          positive: updates.feedback.positive,
          negative: updates.feedback.negative,
          needsReview: updates.feedback.needsReview,
        }),
      };

      await index.update({
        id,
        metadata: updatedMetadata,
      });

      this.logger.log(`Template atualizado com sucesso: ${id}`);
      return true;
    } catch (error: unknown) {
      const err = error as Error;
      this.logger.error(`Erro ao atualizar template: ${err.message}`, err.stack);
      return false;
    }
  }

  /**
   * Exclui um template do Pinecone
   * @param id ID do template
   * @returns Confirmação de exclusão
   */
  async deleteTemplate(id: string): Promise<boolean> {
    try {
      const index = this.pinecone.Index(this.indexName);
      await index.deleteOne(id);
      this.logger.log(`Template excluído com sucesso: ${id}`);
      return true;
    } catch (error: unknown) {
      const err = error as Error;
      this.logger.error(`Erro ao excluir template: ${err.message}`, err.stack);
      return false;
    }
  }
}
