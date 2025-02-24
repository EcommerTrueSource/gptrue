import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v4 as uuidv4 } from 'uuid';
import { ConversationRequestDto, ConversationResponseDto } from '../../api-gateway/dtos/conversation.dto';
import { ConversationState, ConversationMessage, ProcessingResult } from '../interfaces/conversation.interface';
import { SemanticCacheService } from '../../semantic-cache/services/semantic-cache.service';
import { QueryGeneratorService } from '../../query-generator/services/query-generator.service';
import { QueryValidatorService } from '../../query-validator/services/query-validator.service';
import { ResponseGeneratorService } from '../../response-generator/services/response-generator.service';
import { BigQueryService } from '../../../database/bigquery/bigquery.service';
import { ProcessingError } from '../errors/processing.error';
import { ProcessedResponse } from '../interfaces/processed-response.interface';

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
      const cacheResult = await this.semanticCacheService.findSimilarQuestion(request.message);
      
      let result: ProcessingResult;
      if (cacheResult && cacheResult.confidence >= 0.85) {
        this.logger.debug(`Cache hit para a pergunta: ${request.message}`);
        result = cacheResult;
      } else {
        // Gerar e validar consulta SQL
        const sqlQuery = await this.queryGeneratorService.generateQuery(request.message, conversation.context);
        await this.queryValidatorService.validateQuery(sqlQuery);

        // Executar consulta e gerar resposta
        const queryResult = await this.queryValidatorService.executeQuery(sqlQuery);
        result = await this.responseGeneratorService.generateResponse(request.message, queryResult);

        // Armazenar no cache
        await this.semanticCacheService.storeResult(request.message, result);
      }

      // Atualizar estado da conversa
      this.updateConversationState(conversation, request.message, result);

      return this.createResponse(conversationId, result);
    } catch (error) {
      this.logger.error(`Erro ao processar conversa: ${error.message}`, error.stack);
      throw error;
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

  async processFeedback(id: string, feedback: { type: 'positive' | 'negative'; comment?: string }): Promise<void> {
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
      userId: 'user-id', // TODO: Implementar autenticação
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

  private createResponse(conversationId: string, result: ProcessingResult): ConversationResponseDto {
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
    this.logger.log(`Processando pergunta: ${question}`);

    try {
      // 1. Gerar SQL a partir da pergunta
      this.logger.debug('Gerando SQL...');
      const sqlQuery = await this.queryGeneratorService.generateSQL(question);
      
      // 2. Validar a query gerada
      this.logger.debug('Validando SQL...');
      const isValid = await this.bigQueryService.validateQuery(sqlQuery);
      if (!isValid) {
        throw new ProcessingError('SQL gerado é inválido');
      }

      // 3. Executar a query
      this.logger.debug('Executando query...');
      const queryResult = await this.bigQueryService.executeQuery(sqlQuery);

      // 4. Gerar resposta em linguagem natural
      this.logger.debug('Gerando resposta...');
      const response = await this.responseGeneratorService.generateResponse({
        question,
        sqlQuery,
        queryResult,
      });

      // 5. Retornar resposta processada
      return {
        question,
        sql: sqlQuery,
        result: queryResult,
        response,
        metadata: {
          processedAt: new Date().toISOString(),
          success: true,
        },
      };
    } catch (error) {
      this.logger.error('Erro ao processar pergunta:', error);
      
      throw new ProcessingError(
        `Falha ao processar pergunta: ${error.message}`,
        error
      );
    }
  }

  async validateAndOptimizeQuery(sqlQuery: string): Promise<string> {
    try {
      // Validação básica
      const isValid = await this.bigQueryService.validateQuery(sqlQuery);
      if (!isValid) {
        throw new Error('Query SQL inválida');
      }

      // Aqui poderíamos adicionar otimizações futuras
      return sqlQuery;
    } catch (error) {
      throw new ProcessingError(`Erro na validação/otimização: ${error.message}`);
    }
  }
} 