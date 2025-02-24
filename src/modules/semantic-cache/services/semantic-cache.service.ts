import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PineconeClient, Vector } from '@pinecone-database/pinecone';
import { v4 as uuidv4 } from 'uuid';
import { CacheTemplate, SimilaritySearchResult, CacheConfig } from '../interfaces/cache.interface';
import { ProcessingResult } from '../../orchestrator/interfaces/conversation.interface';
import { OpenAIEmbeddings } from 'langchain/embeddings/openai';

@Injectable()
export class SemanticCacheService implements OnModuleInit {
  private readonly logger = new Logger(SemanticCacheService.name);
  private pinecone: PineconeClient;
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
      this.pinecone = new PineconeClient();
      await this.pinecone.init({
        apiKey: this.configService.get<string>('pinecone.apiKey'),
        environment: this.configService.get<string>('pinecone.environment'),
      });

      this.logger.log('Pinecone inicializado com sucesso');
    } catch (error) {
      this.logger.error('Erro ao inicializar Pinecone:', error);
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
        namespace: this.config.namespace,
      });

      if (queryResult.matches.length === 0) {
        return null;
      }

      const match = queryResult.matches[0];
      const score = match.score;

      if (score < this.config.similarityThreshold) {
        return null;
      }

      const template = match.metadata as CacheTemplate;
      return {
        message: template.response,
        metadata: {
          processingTimeMs: template.metadata.executionTimeMs,
          source: 'cache',
          confidence: score,
          tables: template.metadata.sourceTables,
          sql: template.query,
        },
      };
    } catch (error) {
      this.logger.error(`Erro ao buscar pergunta similar: ${error.message}`, error.stack);
      return null;
    }
  }

  async storeResult(question: string, result: ProcessingResult): Promise<void> {
    try {
      const embedding = await this.generateEmbedding(question);
      const index = this.pinecone.Index(this.configService.get<string>('pinecone.indexName'));

      const template: CacheTemplate = {
        id: uuidv4(),
        question,
        questionEmbedding: embedding,
        query: result.metadata.sql,
        response: result.message,
        metadata: {
          createdAt: new Date(),
          updatedAt: new Date(),
          version: '1.0',
          executionTimeMs: result.metadata.processingTimeMs,
          sourceTables: result.metadata.tables || [],
        },
        feedback: {
          positive: 0,
          negative: 0,
          comments: [],
          needsReview: false,
        },
      };

      if (this.config.ttlEnabled) {
        const ttl = new Date();
        ttl.setDate(ttl.getDate() + this.config.ttlDays);
        template.ttl = ttl;
      }

      await index.upsert({
        upsertRequest: {
          vectors: [{
            id: template.id,
            values: embedding,
            metadata: template,
          }],
          namespace: this.config.namespace,
        },
      });

      this.logger.debug(`Template armazenado com sucesso: ${template.id}`);
    } catch (error) {
      this.logger.error(`Erro ao armazenar template: ${error.message}`, error.stack);
      throw error;
    }
  }

  async updateFeedback(question: string, feedback: { type: 'positive' | 'negative'; comment?: string }): Promise<void> {
    try {
      const embedding = await this.generateEmbedding(question);
      const index = this.pinecone.Index(this.configService.get<string>('pinecone.indexName'));

      const queryResult = await index.query({
        vector: embedding,
        topK: 1,
        includeMetadata: true,
        namespace: this.config.namespace,
      });

      if (queryResult.matches.length === 0) {
        return;
      }

      const match = queryResult.matches[0];
      const template = match.metadata as CacheTemplate;

      // Atualizar feedback
      if (feedback.type === 'positive') {
        template.feedback.positive += 1;
      } else {
        template.feedback.negative += 1;
      }

      if (feedback.comment) {
        template.feedback.comments.push(feedback.comment);
      }

      template.feedback.needsReview = template.feedback.negative > template.feedback.positive;
      template.metadata.updatedAt = new Date();

      // Atualizar no Pinecone
      await index.update({
        updateRequest: {
          id: template.id,
          setMetadata: template,
          namespace: this.config.namespace,
        },
      });

      this.logger.debug(`Feedback atualizado para template: ${template.id}`);
    } catch (error) {
      this.logger.error(`Erro ao atualizar feedback: ${error.message}`, error.stack);
      throw error;
    }
  }

  private async generateEmbedding(text: string): Promise<number[]> {
    try {
      const embeddings = await this.embeddings.embedQuery(text);
      return embeddings;
    } catch (error) {
      this.logger.error(`Erro ao gerar embedding: ${error.message}`, error.stack);
      throw error;
    }
  }
} 