import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Pinecone, PineconeRecord } from '@pinecone-database/pinecone';
import { v4 as uuidv4 } from 'uuid';
import { CacheTemplate, SimilaritySearchResult, CacheConfig } from '../interfaces/cache.interface';
import { ProcessingResult } from '../../orchestrator/interfaces/conversation.interface';
import { OpenAIEmbeddings } from '@langchain/openai';
import { PineconeMetadata } from '../interfaces/pinecone.interface';
import { ISemanticCacheService, HealthStatus, CacheClearResult } from '../interfaces/semantic-cache.interface';
import { Template, TemplateUpdateRequest, CacheClearOptions } from '../../orchestrator/interfaces/orchestrator.interface';

@Injectable()
export class SemanticCacheService implements ISemanticCacheService {
  private readonly logger = new Logger(SemanticCacheService.name);
  private readonly pinecone: Pinecone;
  private embeddings: OpenAIEmbeddings;
  private config: CacheConfig;

  constructor(private readonly configService: ConfigService) {
    this.config = {
      similarityThreshold: this.configService.get<number>('pinecone.similarityThreshold'),
      ttlEnabled: this.configService.get<boolean>('pinecone.ttl.enabled'),
      ttlDays: this.configService.get<number>('pinecone.ttl.days'),
      namespace: this.configService.get<string>('pinecone.namespace'),
    };

    this.embeddings = new OpenAIEmbeddings({
      openAIApiKey: this.configService.get<string>('ai.openai.apiKey'),
      modelName: this.configService.get<string>('ai.openai.embeddingModel'),
    });

    this.pinecone = new Pinecone({
      apiKey: this.configService.get<string>('pinecone.apiKey') || '',
    });
    this.logger.log('Pinecone inicializado com sucesso');
  }

  async findSimilarQuestion(question: string): Promise<ProcessingResult | null> {
    try {
      const embedding = await this.generateEmbedding(question);
      const index = this.pinecone.Index(this.configService.get<string>('pinecone.indexName'));

      const queryResult = await index.query({
        vector: embedding,
        topK: 1,
        includeMetadata: true,
      });

      if (queryResult.matches.length === 0) {
        return null;
      }

      const match = queryResult.matches[0];
      const score = match.score;

      if (score < this.config.similarityThreshold) {
        return null;
      }

      const metadata = match.metadata as PineconeMetadata;

      return {
        message: metadata.response,
        metadata: {
          processingTimeMs: metadata.executionTimeMs,
          source: 'cache',
          confidence: score,
          tables: metadata.sourceTables,
          sql: metadata.query,
        },
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      this.logger.error('Erro ao buscar pergunta similar:', {
        error: errorMessage,
        stack: error instanceof Error ? error.stack : undefined,
      });
      return null;
    }
  }

  async storeResult(question: string, result: ProcessingResult): Promise<void> {
    try {
      const embedding = await this.generateEmbedding(question);
      const index = this.pinecone.Index(this.configService.get<string>('pinecone.indexName'));

      const record: PineconeRecord<PineconeMetadata> = {
        id: uuidv4(),
        values: embedding,
        metadata: {
          question,
          response: result.message,
          query: result.metadata.sql,
          executionTimeMs: result.metadata.processingTimeMs,
          sourceTables: result.metadata.tables || [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          version: '1.0',
          feedbackPositive: 0,
          feedbackNegative: 0,
          feedbackComments: [],
          needsReview: false,
        },
      };

      await index.upsert([record]);

      this.logger.debug(`Template armazenado com sucesso: ${record.id}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      this.logger.error('Erro ao armazenar template:', {
        error: errorMessage,
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw error;
    }
  }

  async updateFeedback(
    question: string,
    feedback: { type: 'positive' | 'negative'; comment?: string },
  ): Promise<void> {
    try {
      const embedding = await this.generateEmbedding(question);
      const index = this.pinecone.Index(this.configService.get<string>('pinecone.indexName'));

      const queryResult = await index.query({
        vector: embedding,
        topK: 1,
        includeMetadata: true,
      });

      if (queryResult.matches.length === 0) {
        return;
      }

      const match = queryResult.matches[0];
      const metadata = match.metadata as PineconeMetadata;

      const updatedMetadata: PineconeMetadata = {
        ...metadata,
        feedbackPositive: feedback.type === 'positive' ? metadata.feedbackPositive + 1 : metadata.feedbackPositive,
        feedbackNegative: feedback.type === 'negative' ? metadata.feedbackNegative + 1 : metadata.feedbackNegative,
        feedbackComments: feedback.comment ? [...metadata.feedbackComments, feedback.comment] : metadata.feedbackComments,
        needsReview: feedback.type === 'negative',
        updatedAt: new Date().toISOString(),
      };

      await index.update({
        id: match.id,
        metadata: updatedMetadata,
      });

      this.logger.debug(`Feedback atualizado para template: ${match.id}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      this.logger.error('Erro ao atualizar feedback:', {
        error: errorMessage,
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw error;
    }
  }

  private async generateEmbedding(text: string): Promise<number[]> {
    try {
      const embeddings = await this.embeddings.embedQuery(text);
      return embeddings;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      this.logger.error('Erro ao gerar embedding:', {
        error: errorMessage,
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw error;
    }
  }

  async checkHealth(): Promise<HealthStatus> {
    try {
      const startTime = Date.now();
      const index = this.pinecone.Index(this.configService.get<string>('pinecone.indexName'));
      await index.describeIndexStats();
      const latency = Date.now() - startTime;

      return {
        status: 'ok',
        latency
      };
    } catch (error) {
      return {
        status: 'error',
        latency: -1
      };
    }
  }

  async listTemplates(type?: string, minConfidence?: number): Promise<Template[]> {
    try {
      const index = this.pinecone.Index(this.configService.get<string>('pinecone.indexName'));

      // Fetch all templates
      const queryResult = await index.query({
        vector: new Array(1536).fill(0), // Dummy vector to fetch all
        topK: 10000,
        includeMetadata: true
      });

      const templates = queryResult.matches.map(match => {
        const metadata = match.metadata as PineconeMetadata;
        return {
          id: match.id,
          question: metadata.question,
          sql: metadata.query,
          usage: {
            hits: Number(metadata.hits || 0),
            lastUsed: metadata.updatedAt
          },
          feedback: {
            positive: metadata.feedbackPositive,
            negative: metadata.feedbackNegative
          }
        };
      });

      // Apply filters if provided
      return templates.filter(template => {
        if (type && template.sql.toLowerCase().includes(type.toLowerCase())) {
          return false;
        }
        if (minConfidence) {
          const totalFeedback = template.feedback.positive + template.feedback.negative;
          const confidence = totalFeedback > 0 ? template.feedback.positive / totalFeedback : 0;
          return confidence >= minConfidence;
        }
        return true;
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      this.logger.error('Erro ao listar templates:', {
        error: errorMessage,
        stack: error instanceof Error ? error.stack : undefined
      });
      throw error;
    }
  }

  async updateTemplate(id: string, template: TemplateUpdateRequest): Promise<Template> {
    try {
      const index = this.pinecone.Index(this.configService.get<string>('pinecone.indexName'));

      // Fetch existing template
      const queryResult = await index.query({
        vector: new Array(1536).fill(0), // Dummy vector to fetch specific ID
        topK: 1,
        includeMetadata: true,
        filter: { id: { $eq: id } }
      });

      if (queryResult.matches.length === 0) {
        throw new Error('Template não encontrado');
      }

      const match = queryResult.matches[0];
      const metadata = match.metadata as PineconeMetadata;
      const updatedMetadata: PineconeMetadata = {
        ...metadata,
        query: template.sql || metadata.query,
        updatedAt: new Date().toISOString(),
        needsReview: false
      };

      // Update template
      await index.update({
        id,
        metadata: updatedMetadata
      });

      return {
        id,
        question: metadata.question,
        sql: updatedMetadata.query,
        usage: {
          hits: Number(metadata.hits || 0),
          lastUsed: updatedMetadata.updatedAt
        },
        feedback: {
          positive: metadata.feedbackPositive,
          negative: metadata.feedbackNegative
        }
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      this.logger.error('Erro ao atualizar template:', {
        error: errorMessage,
        stack: error instanceof Error ? error.stack : undefined
      });
      throw error;
    }
  }

  async deleteTemplate(id: string): Promise<void> {
    try {
      const index = this.pinecone.Index(this.configService.get<string>('pinecone.indexName'));
      await index.deleteOne(id);
      this.logger.debug(`Template removido com sucesso: ${id}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      this.logger.error('Erro ao remover template:', {
        error: errorMessage,
        stack: error instanceof Error ? error.stack : undefined
      });
      throw error;
    }
  }

  async clearCache(options: CacheClearOptions): Promise<CacheClearResult> {
    try {
      const index = this.pinecone.Index(this.configService.get<string>('pinecone.indexName'));

      let filter: Record<string, any> = {};
      if (options.olderThan) {
        filter.updatedAt = { $lt: new Date(options.olderThan).toISOString() };
      }
      if (options.type) {
        filter.type = options.type;
      }

      // Count affected templates before deletion
      const queryResult = await index.query({
        vector: new Array(1536).fill(0), // Dummy vector to fetch all
        topK: 10000,
        filter
      });

      const affectedTemplates = queryResult.matches.length;

      // Delete templates
      if (affectedTemplates > 0) {
        await index.deleteMany({
          filter
        });
      }

      return {
        clearedTemplates: affectedTemplates,
        affectedQueries: affectedTemplates
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      this.logger.error('Erro ao limpar cache:', {
        error: errorMessage,
        stack: error instanceof Error ? error.stack : undefined
      });
      throw error;
    }
  }

  async checkConnection(): Promise<any> {
    try {
      const indexName = this.configService.get<string>('pinecone.indexName');
      const description = await this.pinecone.describeIndex(indexName);
      return {
        connected: true,
        indexName,
        description,
      };
    } catch (error) {
      this.logger.error('Erro ao verificar conexão com Pinecone', error);
      throw error;
    }
  }
}
