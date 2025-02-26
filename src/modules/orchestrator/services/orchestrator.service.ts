import { Injectable, Logger, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v4 as uuidv4 } from 'uuid';
import {
  ConversationRequestDto,
  ConversationResponseDto,
  QueryMetadataDto,
} from '../../api-gateway/dtos/conversation.dto';
import {
  FeedbackRequestDto,
  FeedbackResponseDto,
  FeedbackType,
} from '../../api-gateway/dtos/feedback-request.dto';
import {
  ConversationState,
  ConversationMessage,
  ProcessingResult,
  MessageMetadata,
  MessageFeedback,
} from '../interfaces/conversation.interface';
import {
  IOrchestratorService,
  MetricsResponse,
  Template,
  TemplateListResponse,
  TemplateUpdateRequest,
  CacheClearOptions,
  CacheClearResponse,
  HealthCheckResponse,
} from '../interfaces/orchestrator.interface';
import { ISemanticCacheService, SEMANTIC_CACHE_SERVICE } from '../../semantic-cache/interfaces/semantic-cache.interface';
import { IQueryGeneratorService, QUERY_GENERATOR_SERVICE } from '../../query-generator/interfaces/query-generator.interface';
import { IBigQueryService, BIGQUERY_SERVICE, QueryResult } from '../../../database/bigquery/interfaces/bigquery.interface';
import { QueryValidatorService } from '../../query-validator/services/query-validator.service';
import { ResponseGeneratorService } from '../../response-generator/services/response-generator.service';
import { ProcessingError } from '../errors/processing.error';

@Injectable()
export class OrchestratorService implements IOrchestratorService {
  private readonly logger = new Logger(OrchestratorService.name);
  private readonly conversations = new Map<string, ConversationState>();

  constructor(
    private readonly configService: ConfigService,
    @Inject(SEMANTIC_CACHE_SERVICE)
    private readonly semanticCacheService: ISemanticCacheService,
    @Inject(QUERY_GENERATOR_SERVICE)
    private readonly queryGeneratorService: IQueryGeneratorService,
    private readonly queryValidatorService: QueryValidatorService,
    private readonly responseGeneratorService: ResponseGeneratorService,
    @Inject(BIGQUERY_SERVICE)
    private readonly bigQueryService: IBigQueryService,
  ) {}

  async processConversation(request: ConversationRequestDto): Promise<ConversationResponseDto> {
    const startTime = Date.now();
    let conversationId = request.conversationId;
    let conversation: ConversationState;

    try {
      // Inicializar ou recuperar conversa
      if (conversationId && this.conversations.has(conversationId)) {
        conversation = this.conversations.get(conversationId);
      } else {
        conversationId = uuidv4();
        conversation = this.initializeConversation(conversationId, request);
      }

      // Verificar cache semântico
      const cacheResult = await this.semanticCacheService.findSimilarQuestion(request.message);

      let result: ProcessingResult;
      if (cacheResult && cacheResult.confidence >= 0.85) {
        this.logger.debug(`Cache hit para a pergunta: ${request.message}`);
        result = cacheResult;
      } else {
        // Gerar SQL
        const sqlQuery = await this.queryGeneratorService.generateSQL(request.message);

        // Validar SQL
        const isValid = await this.queryValidatorService.validateQuery(sqlQuery);
        if (!isValid) {
          throw new Error('SQL gerado é inválido');
        }

        // Executar consulta
        const queryResult = await this.bigQueryService.executeQuery(sqlQuery);

        // Converter resultado para o formato esperado pelo ResponseGenerator
        const formattedResult = {
          rows: queryResult.rows,
          metadata: {
            schema: [], // TODO: Implementar mapeamento do schema
            totalRows: queryResult.metadata.totalRows,
            processingTime: new Date().toISOString(),
            bytesProcessed: queryResult.metadata.processedBytes,
            cacheHit: false,
            sql: sqlQuery,
          },
        };

        result = await this.responseGeneratorService.generateResponse({
          question: request.message,
          queryResult: formattedResult,
          metadata: {
            startTime: startTime,
          },
        });

        // Armazenar no cache
        await this.semanticCacheService.storeResult(request.message, result);
      }

      // Atualizar estado da conversa
      this.updateConversationState(conversation, request.message, result);

      return this.createResponse(conversationId, result);
    } catch (error: unknown) {
      const err = error as Error;
      this.logger.error('Erro ao processar conversa', {
        error: err.message,
        stack: err.stack,
        request: {
          conversationId,
          message: request.message,
        },
      });
      throw new ProcessingError(`Falha ao processar conversa: ${err.message}`, err);
    }
  }

  async getConversation(id: string): Promise<ConversationResponseDto> {
    const conversation = this.conversations.get(id);
    if (!conversation) {
      throw new Error('Conversa não encontrada');
    }

    const lastMessage = conversation.messages[conversation.messages.length - 1];
    return this.createResponse(id, {
      message: lastMessage.content,
      metadata: lastMessage.metadata,
    } as ProcessingResult);
  }

  async processFeedback(id: string, feedback: FeedbackRequestDto): Promise<FeedbackResponseDto> {
    const conversation = this.conversations.get(id);
    if (!conversation) {
      throw new Error('Conversa não encontrada');
    }

    const lastMessage = conversation.messages[conversation.messages.length - 1];
    const feedbackData: MessageFeedback = {
      type: feedback.type,
      comment: feedback.comment,
      timestamp: new Date(),
    };

    lastMessage.feedback = feedbackData;

    // Atualizar cache com feedback
    if (lastMessage.metadata?.source === 'cache') {
      await this.semanticCacheService.updateFeedback(lastMessage.content, feedbackData);
    }

    return {
      id: uuidv4(),
      responseId: id,
      type: feedback.type,
      timestamp: new Date(),
      status: 'processed',
      actions: ['Template atualizado no cache', 'Métricas de qualidade atualizadas'],
    };
  }

  async getMetrics(startDate?: string, endDate?: string): Promise<MetricsResponse> {
    this.logger.debug('Obtendo métricas do sistema', { startDate, endDate });

    // TODO: Implementar coleta real de métricas
    return {
      performance: {
        averageResponseTimeMs: 245,
        cacheHitRate: 0.85,
        resourceUsage: {
          cpu: 45,
          memory: 1024,
          requests: 100,
        },
      },
      quality: {
        positiveFeedbackRate: 0.92,
        accuracy: 0.95,
        abandonmentRate: 0.03,
      },
      costs: {
        vertexAiCost: 50.25,
        bigQueryCost: 25.10,
        pineconeCost: 15.75,
      },
    };
  }

  async listTemplates(type?: string, minConfidence?: number): Promise<TemplateListResponse> {
    this.logger.debug('Listando templates', { type, minConfidence });

    const templates = await this.semanticCacheService.listTemplates(type, minConfidence);

    return {
      templates: templates.map(t => ({
        id: t.id,
        question: t.question,
        sql: t.sql,
        usage: {
          hits: t.usage.hits,
          lastUsed: t.usage.lastUsed,
        },
        feedback: {
          positive: t.feedback.positive,
          negative: t.feedback.negative,
        },
      })),
      metadata: {
        total: templates.length,
        filtered: templates.length,
        page: 1,
        pageSize: 10,
      },
    };
  }

  async updateTemplate(id: string, template: TemplateUpdateRequest): Promise<Template> {
    this.logger.debug('Atualizando template', { id, template });

    const updatedTemplate = await this.semanticCacheService.updateTemplate(id, template);

    return {
      id: updatedTemplate.id,
      question: updatedTemplate.question,
      sql: updatedTemplate.sql,
      usage: {
        hits: updatedTemplate.usage.hits,
        lastUsed: updatedTemplate.usage.lastUsed,
      },
      feedback: {
        positive: updatedTemplate.feedback.positive,
        negative: updatedTemplate.feedback.negative,
      },
    };
  }

  async deleteTemplate(id: string): Promise<void> {
    this.logger.debug('Removendo template', { id });
    await this.semanticCacheService.deleteTemplate(id);
  }

  async clearCache(options: CacheClearOptions): Promise<CacheClearResponse> {
    this.logger.debug('Limpando cache', options);

    const result = await this.semanticCacheService.clearCache(options);

    return {
      clearedTemplates: result.clearedTemplates,
      affectedQueries: result.affectedQueries,
      timestamp: new Date().toISOString(),
    };
  }

  async checkHealth(): Promise<HealthCheckResponse> {
    try {
      const startTime = Date.now();
      const [cacheHealth, bigQueryHealth] = await Promise.all([
        this.semanticCacheService.checkHealth(),
        this.bigQueryService.checkHealth(),
      ]);

      const latency = Date.now() - startTime;

      const status = cacheHealth.status === 'ok' && bigQueryHealth ? 'healthy' : 'degraded';
      const timestamp = new Date().toISOString();

      return {
        status,
        components: {
          cache: {
            status: cacheHealth.status,
            latency: cacheHealth.latency,
          },
          bigquery: {
            status: bigQueryHealth ? 'ok' : 'error',
            latency: -1,
          },
        },
        resources: {
          cpu: { usage: 0, status: 'ok' },
          memory: { usage: 0, status: 'ok' },
        },
        lastCheck: timestamp,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      this.logger.error('Erro ao verificar saúde do sistema:', {
        error: errorMessage,
        stack: error instanceof Error ? error.stack : undefined,
      });

      return {
        status: 'unhealthy',
        components: {
          cache: { status: 'error', latency: -1 },
          bigquery: { status: 'error', latency: -1 },
        },
        resources: {
          cpu: { usage: 0, status: 'error' },
          memory: { usage: 0, status: 'error' },
        },
        lastCheck: new Date().toISOString(),
      };
    }
  }

  private initializeConversation(id: string, request: ConversationRequestDto): ConversationState {
    const conversation: ConversationState = {
      id,
      messages: [],
      context: request.context || {},
      metadata: {
        createdAt: new Date(),
        updatedAt: new Date(),
        totalInteractions: 0,
      },
      userId: request.userId || 'anonymous',
    };

    this.conversations.set(id, conversation);
    return conversation;
  }

  private updateConversationState(
    conversation: ConversationState,
    userMessage: string,
    result: ProcessingResult,
  ): void {
    const timestamp = new Date();

    // Adicionar mensagem do usuário
    conversation.messages.push({
      id: uuidv4(),
      role: 'user',
      content: userMessage,
      timestamp,
    });

    // Adicionar resposta do assistente
    conversation.messages.push({
      id: uuidv4(),
      role: 'assistant',
      content: result.message,
      timestamp,
      metadata: result.metadata,
    });

    // Atualizar metadados
    conversation.metadata.updatedAt = timestamp;
    conversation.metadata.lastProcessingTimeMs = result.metadata.processingTimeMs;
    conversation.metadata.totalInteractions += 1;
  }

  private createResponse(
    conversationId: string,
    result: ProcessingResult,
  ): ConversationResponseDto {
    const metadata: QueryMetadataDto = {
      processingTimeMs: result.metadata.processingTimeMs || 0,
      source: result.metadata.source || 'query',
      confidence: result.metadata.confidence || 1,
      tables: result.metadata.tables,
      sql: result.metadata.sql,
    };

    return {
      id: uuidv4(),
      conversationId,
      message: result.message,
      metadata,
      data: result.data,
      suggestions: result.suggestions,
      feedbackOptions: {
        thumbsUp: true,
        thumbsDown: true,
        commentEnabled: true,
      },
    };
  }
}
