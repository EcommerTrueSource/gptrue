import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v4 as uuidv4 } from 'uuid';
import {
  ConversationRequestDto,
  ConversationResponseDto,
} from '../../api-gateway/dtos/conversation.dto';
import {
  ConversationState,
  ConversationMessage,
  ProcessingResult,
} from '../interfaces/conversation.interface';
import { SemanticCacheService } from '../../semantic-cache/services/semantic-cache.service';
import { QueryGeneratorService } from '../../query-generator/services/query-generator.service';
import { QueryValidatorService } from '../../query-validator/services/query-validator.service';
import { ResponseGeneratorService } from '../../response-generator/services/response-generator.service';
import { BigQueryService } from '../../../database/bigquery/bigquery.service';
import { ProcessingError } from '../errors/processing.error';
import { ProcessedResponse } from '../interfaces/processed-response.interface';
import { QueryResult as BigQueryResult } from '../../../database/bigquery/interfaces/bigquery.interface';
import { QueryResult as ResponseQueryResult } from '../../response-generator/interfaces/response-generator.interface';

interface CacheResult extends ProcessingResult {
  confidence: number;
}

interface QueryGeneratorOptions {
  context?: Record<string, any>;
  options?: {
    maxResultRows?: number;
    includeSql?: boolean;
    timeout?: number;
  };
}

interface QueryRow {
  [key: string]: any;
}

@Injectable()
export class OrchestratorService {
  private readonly logger = new Logger(OrchestratorService.name);
  private readonly conversations = new Map<string, ConversationState>();

  constructor(
    private readonly configService: ConfigService,
    private readonly semanticCacheService: SemanticCacheService,
    private readonly queryGeneratorService: QueryGeneratorService,
    private readonly queryValidatorService: QueryValidatorService,
    private readonly responseGeneratorService: ResponseGeneratorService,
    private readonly bigQueryService: BigQueryService,
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
      const cacheResult = await this.semanticCacheService.findSimilarQuestion(request.message) as CacheResult;

      let result: ProcessingResult;
      if (cacheResult && cacheResult.confidence >= 0.85) {
        this.logger.debug(`Cache hit para a pergunta: ${request.message}`);
        result = cacheResult;
      } else {
        // Gerar SQL
        const sqlQuery = await this.queryGeneratorService.generateSQL(request.message);

        // Executar consulta
        const rows = await this.bigQueryService.executeQuery<QueryRow>(sqlQuery);

        // Converter resultado para o formato esperado pelo ResponseGenerator
        const formattedResult: ResponseQueryResult = {
          rows,
          metadata: {
            schema: [], // TODO: Implementar mapeamento do schema
            totalRows: rows.length,
            processingTime: new Date().toISOString(),
            bytesProcessed: 0,
            cacheHit: false,
            sql: sqlQuery,
          },
        };

        result = await this.responseGeneratorService.generateResponse({
          question: request.message,
          queryResult: formattedResult,
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
    } finally {
      const processingTime = Date.now() - startTime;
      this.logger.debug(`Tempo de processamento: ${processingTime}ms`);
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

  async processFeedback(
    id: string,
    feedback: { type: 'positive' | 'negative'; comment?: string },
  ): Promise<void> {
    const conversation = this.conversations.get(id);
    if (!conversation) {
      throw new Error('Conversa não encontrada');
    }

    const lastMessage = conversation.messages[conversation.messages.length - 1];
    lastMessage.feedback = {
      ...feedback,
      timestamp: new Date(),
    };

    // Atualizar cache com feedback
    if (lastMessage.metadata?.source === 'cache') {
      await this.semanticCacheService.updateFeedback(lastMessage.content, feedback);
    }
  }

  private initializeConversation(id: string, request: ConversationRequestDto): ConversationState {
    const conversation: ConversationState = {
      id,
      userId: request.userId || 'anonymous',
      messages: [],
      context: request.context || {},
      metadata: {
        createdAt: new Date(),
        updatedAt: new Date(),
        totalInteractions: 0,
      },
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
    return {
      id: uuidv4(),
      conversationId,
      message: result.message,
      metadata: result.metadata,
      data: result.data,
      suggestions: result.suggestions,
      feedbackOptions: {
        thumbsUp: true,
        thumbsDown: true,
        commentEnabled: true,
      },
    };
  }

  async processQuestion(question: string): Promise<ProcessedResponse> {
    this.logger.debug('Iniciando processamento de pergunta', { question });

    try {
      // 1. Gerar SQL a partir da pergunta
      const sqlQuery = await this.queryGeneratorService.generateSQL(question);

      // 2. Executar a query
      const rows = await this.bigQueryService.executeQuery<QueryRow>(sqlQuery);

      // Converter resultado para o formato esperado pelo ResponseGenerator
      const formattedResult: ResponseQueryResult = {
        rows,
        metadata: {
          schema: [], // TODO: Implementar mapeamento do schema
          totalRows: rows.length,
          processingTime: new Date().toISOString(),
          bytesProcessed: 0,
          cacheHit: false,
          sql: sqlQuery,
        },
      };

      // 3. Gerar resposta em linguagem natural
      const response = await this.responseGeneratorService.generateResponse({
        question,
        queryResult: formattedResult,
      });

      // 4. Retornar resposta processada
      const processedResponse: ProcessedResponse = {
        question,
        sql: sqlQuery,
        result: {
          rows,
          metadata: {
            totalRows: rows.length,
            processedAt: new Date().toISOString(),
          },
        },
        response: response.message,
        metadata: {
          processedAt: new Date().toISOString(),
          success: true,
          ...response.metadata,
        },
      };

      return processedResponse;
    } catch (error: unknown) {
      const err = error as Error;
      this.logger.error('Erro ao processar pergunta', {
        error: err.message,
        stack: err.stack,
        question,
      });

      throw new ProcessingError(`Falha ao processar pergunta: ${err.message}`, err);
    }
  }

  async validateAndOptimizeQuery(sqlQuery: string): Promise<string> {
    try {
      // Validação básica usando dryRun do BigQuery
      const isValid = await this.bigQueryService.dryRun(sqlQuery);
      if (!isValid) {
        throw new Error('Query SQL inválida');
      }

      // Aqui poderíamos adicionar otimizações futuras
      return sqlQuery;
    } catch (error: unknown) {
      const err = error as Error;
      throw new ProcessingError(`Erro na validação/otimização: ${err.message}`, err);
    }
  }
}
