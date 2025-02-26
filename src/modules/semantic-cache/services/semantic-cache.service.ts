import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Pinecone, PineconeRecord } from '@pinecone-database/pinecone';
import { v4 as uuidv4 } from 'uuid';
import { CacheTemplate, SimilaritySearchResult, CacheConfig } from '../interfaces/cache.interface';
import { ProcessingResult } from '../../orchestrator/interfaces/conversation.interface';
import { OpenAIEmbeddings } from 'langchain/embeddings/openai';
import { PineconeMetadata } from '../interfaces/pinecone.interface';

@Injectable()
export class SemanticCacheService implements OnModuleInit {
  private readonly logger = new Logger(SemanticCacheService.name);
  private pinecone: Pinecone;
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
  }

  async onModuleInit() {
    try {
      this.pinecone = new Pinecone({
        apiKey: this.configService.get<string>('pinecone.apiKey'),
      });

      this.logger.log('Pinecone inicializado com sucesso');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      this.logger.error('Erro ao inicializar Pinecone:', errorMessage);
      throw error;
    }
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
}
