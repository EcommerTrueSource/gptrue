import { Injectable, Logger, Inject, OnModuleInit, NotFoundException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v4 as uuidv4 } from 'uuid';
import * as fs from 'fs';
import * as path from 'path';
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
import { ISemanticCacheService, SEMANTIC_CACHE_SERVICE, ConversationContext } from '../../semantic-cache/interfaces/semantic-cache.interface';
import { IQueryGeneratorService, QUERY_GENERATOR_SERVICE } from '../../query-generator/interfaces/query-generator.interface';
import { IBigQueryService, BIGQUERY_SERVICE, QueryResult } from '../../../database/bigquery/interfaces/bigquery.interface';
import { QueryValidatorService } from '../../query-validator/services/query-validator.service';
import { ResponseGeneratorService } from '../../response-generator/services/response-generator.service';
import { ProcessingError } from '../errors/processing.error';
import { extractConversationTopics, extractConversationEntities, extractPreviousQuestions } from '../../semantic-cache/utils/context-extractor';
import { MonitoringService } from '../../../common/monitoring/monitoring.service';

@Injectable()
export class OrchestratorService implements IOrchestratorService, OnModuleInit {
  private readonly logger = new Logger(OrchestratorService.name);
  private readonly conversations = new Map<string, ConversationState>();
  private template: string;

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
    private readonly monitoringService: MonitoringService,
  ) {}

  onModuleInit() {
    try {
      const templatePath = path.join(process.cwd(), 'templates', 'files', 'orchestrator.template.txt');
      this.template = fs.readFileSync(templatePath, 'utf8');
      this.logger.log(`Template de orquestração carregado com sucesso: ${templatePath}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      const errorStack = error instanceof Error ? error.stack : '';
      this.logger.error(`Erro ao carregar o template de orquestração: ${errorMessage}`, errorStack);
      throw error;
    }
  }

  async processConversation(request: ConversationRequestDto): Promise<ConversationResponseDto> {
    const startTime = Date.now();
    let conversationId = request.conversationId;
    let conversation: ConversationState;

    try {
      // Inicializar ou recuperar conversa
      if (conversationId && this.conversations.has(conversationId)) {
        const existingConversation = this.conversations.get(conversationId);
        if (existingConversation) {
          conversation = existingConversation;
        } else {
          conversationId = uuidv4();
          conversation = this.initializeConversation(conversationId, request);
        }
      } else {
        conversationId = uuidv4();
        conversation = this.initializeConversation(conversationId, request);
      }

      this.logger.debug(`Analisando pergunta: "${request.message}" para determinar rota de processamento`);

      // Verificar se a mensagem é apenas conversacional
      if (this.isConversationalMessage(request.message)) {
        this.logger.log(`[CONVERSATIONAL] Mensagem detectada como conversacional: "${request.message}"`);

        // Gerar uma resposta conversacional contextual
        const conversationalResult = await this.generateConversationalResponse(request.message, conversation);

        // Atualizar o estado da conversa
        this.updateConversationState(conversation, request.message, conversationalResult);

        // Retornar a resposta conversacional
        return this.createResponse(conversationId, conversationalResult);
      }

      // Verificar se é uma pergunta geral sobre e-commerce que não requer SQL
      if (this.isGeneralEcommerceQuestion(request.message)) {
        this.logger.log(`[GENERAL] Pergunta geral sobre e-commerce detectada: "${request.message}"`);

        // Gerar uma resposta para a pergunta geral
        const generalResult = await this.generateGeneralEcommerceResponse(request.message, conversation);

        // Atualizar o estado da conversa
        this.updateConversationState(conversation, request.message, generalResult);

        // Retornar a resposta
        return this.createResponse(conversationId, generalResult);
      }

      // Extrair contexto da conversa
      const conversationContext: ConversationContext = {
        topics: extractConversationTopics(conversation),
        entities: extractConversationEntities(conversation),
        previousQuestions: extractPreviousQuestions(conversation)
      };

      this.logger.debug(`[CONTEXT] Contexto extraído da conversa:`, {
        topics: conversationContext.topics,
        entities: conversationContext.entities,
        previousQuestions: conversationContext.previousQuestions
      });

      // Verificar cache semântico - LOG DETALHADO
      this.logger.log(`[CACHE] Verificando cache semântico para a pergunta: "${request.message}"`);

      // Verificar se a pergunta atual é um subconjunto de uma pergunta anterior
      const subsetResult = await this.checkForSubsetQuery(request.message, conversation);
      if (subsetResult) {
        this.logger.log(`[CACHE] Detectado que a pergunta atual é um subconjunto de uma pergunta anterior em cache`);
        this.logger.log(`[CACHE] Adaptando resultado do cache em vez de gerar nova consulta SQL`);

        // Atualizar o estado da conversa
        this.updateConversationState(conversation, request.message, subsetResult);

        // Retornar a resposta adaptada
        return this.createResponse(conversationId, subsetResult);
      }

      const cacheResult = await this.semanticCacheService.findSimilarQuestion(
        request.message,
        conversationContext,
        conversationId
      );

      let result: ProcessingResult;
      if (cacheResult) {
        // O método findSimilarQuestion já verifica o limiar de similaridade
        this.logger.log(`[CACHE] HIT! Encontrada correspondência no cache com confiança ${cacheResult.metadata.confidence?.toFixed(2) || 'N/A'}`);
        this.logger.log(`[CACHE] Usando resultado do cache em vez de gerar nova consulta SQL`);

        // Garantir que o cacheId esteja presente nos metadados para uso posterior no feedback
        if (cacheResult.metadata && !cacheResult.metadata.cacheId) {
          this.logger.warn(`[CACHE] cacheId não encontrado nos metadados do resultado do cache. Isso pode afetar o processamento de feedback.`);
        } else {
          this.logger.debug(`[CACHE] Resultado do cache tem cacheId: ${cacheResult.metadata.cacheId}`);
        }

        // Verificar se a correspondência é exata ou por similaridade
        if (cacheResult.metadata.isExactMatch === false) {
          // Se for por similaridade, verificar se as perguntas são diferentes
          const originalQuestion = cacheResult.metadata.originalQuestion;
          const currentQuestion = request.message;

          if (originalQuestion && originalQuestion !== currentQuestion) {
            this.logger.log(`[CACHE] Correspondência por similaridade detectada. Analisando diferenças entre perguntas.`);
            this.logger.debug(`[CACHE] Pergunta original: "${originalQuestion}"`);
            this.logger.debug(`[CACHE] Pergunta atual: "${currentQuestion}"`);

            // Analisar se há diferenças significativas que justifiquem adaptação
            const needsAdaptation = this.analyzeQuestionsForAdaptation(originalQuestion, currentQuestion);

            if (needsAdaptation) {
              this.logger.log(`[CACHE] Diferenças significativas detectadas. Adaptando resposta.`);

              try {
                // Adaptar a resposta usando o ResponseGeneratorService
                const adaptedResult = await this.responseGeneratorService.generateResponse({
                  question: currentQuestion,
                  queryResult: {
                    rows: [], // Não temos os dados brutos, apenas a resposta formatada
                    metadata: {
                      schema: [],
                      totalRows: 0,
                      processingTime: new Date().toISOString(),
                      bytesProcessed: 0,
                      cacheHit: true,
                      sql: cacheResult.metadata.sql || '',
                      estimatedCost: 0,
                      originalQuestion,
                      currentQuestion,
                      originalResponse: cacheResult.message
                    },
                  },
                  metadata: {
                    startTime: Date.now() - (cacheResult.metadata.processingTimeMs || 0),
                    adaptFromCache: true
                  },
                });

                // Manter os metadados originais, mas atualizar a mensagem
                result = {
                  ...cacheResult,
                  message: adaptedResult.message,
                  metadata: {
                    ...cacheResult.metadata,
                    adaptedFromCache: true
                  }
                };

                this.logger.log(`[CACHE] Resposta adaptada com sucesso para a pergunta atual.`);

                // Registrar métrica de adaptação bem-sucedida
                this.monitoringService.recordCacheAdaptation('success');
              } catch (adaptError) {
                this.logger.error(`[CACHE] Erro ao adaptar resposta: ${adaptError instanceof Error ? adaptError.message : String(adaptError)}`);
                // Em caso de erro na adaptação, usar a resposta original do cache
                result = cacheResult;

                // Registrar métrica de falha na adaptação
                this.monitoringService.recordCacheAdaptation('failure');
              }
            } else {
              this.logger.log(`[CACHE] Diferenças não significativas. Usando resposta original do cache.`);
              result = cacheResult;

              // Registrar métrica de adaptação ignorada
              this.monitoringService.recordCacheAdaptation('skipped');
            }
          } else {
            // Se as perguntas forem iguais ou não tivermos a pergunta original, usar o resultado do cache como está
            result = cacheResult;
          }
        } else {
          // Se for correspondência exata, usar o resultado do cache como está
          result = cacheResult;
        }
      } else {
        this.logger.log(`[CACHE] MISS! Nenhuma correspondência encontrada no cache. Gerando nova consulta SQL.`);

        try {
          // Gerar SQL
          this.logger.log(`[SQL] Iniciando geração de SQL para a pergunta: "${request.message}"`);
          const sqlQuery = await this.queryGeneratorService.generateSQL(request.message);
          this.logger.log(`[SQL] SQL gerado para a pergunta "${request.message}":\n${sqlQuery}`);

          // Validar SQL
          this.logger.log(`[SQL] Validando SQL gerado`);
          const validationResult = await this.queryValidatorService.validateQuery(sqlQuery);

          if (!validationResult.isValid) {
            const errorMessages = validationResult.errors?.map(e => e.message).join('; ');
            this.logger.warn(`[SQL] SQL inválido: ${errorMessages}`);
            this.logger.warn(`[SQL] SQL rejeitado: ${sqlQuery}`);

            // Gerar resposta de erro amigável
            result = {
              message: `Não foi possível processar sua pergunta. ${errorMessages || 'A consulta SQL gerada é inválida.'}`,
              metadata: {
                source: 'error',
                confidence: 0,
                processingTimeMs: Date.now() - startTime,
                error: {
                  type: 'validation_error',
                  details: errorMessages || 'Erro de validação SQL',
                }
              }
            };
          } else {
            // Verificar se há avisos de validação
            const hasWarnings = validationResult.warnings && validationResult.warnings.length > 0;

            if (hasWarnings) {
              const warningMessages = validationResult.warnings.map(w => w.message).join('; ');
              this.logger.warn(`[SQL] SQL validado com avisos: ${warningMessages}`);
            } else {
              this.logger.log(`[SQL] SQL validado com sucesso. Estimativa de custo: ${validationResult.estimatedCost?.estimatedCost || 'N/A'}`);
            }

            // Executar consulta
            try {
              this.logger.log(`[BIGQUERY] Executando consulta no BigQuery:\n${sqlQuery}`);
              const queryResult = await this.bigQueryService.executeQuery(sqlQuery);
              this.logger.log(`[BIGQUERY] Consulta executada com sucesso. Linhas retornadas: ${queryResult.metadata.totalRows}`);

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
                  estimatedCost: validationResult.estimatedCost?.estimatedCost || 0,
                  warnings: hasWarnings ? validationResult.warnings.map(w => w.message) : undefined,
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
              this.logger.log(`[CACHE] Armazenando resultado no cache para uso futuro`);
              await this.semanticCacheService.storeResult(
                request.message,
                result,
                conversationId,
                conversationContext
              );
              this.logger.debug(`[CACHE] Resultado armazenado no cache com sucesso`);
            } catch (queryError) {
              this.logger.error(`[BIGQUERY] Erro ao executar consulta: ${queryError instanceof Error ? queryError.message : String(queryError)}`);

              // Verificar se é um erro de sintaxe
              const errorMessage = queryError instanceof Error ? queryError.message : String(queryError);
              const isSyntaxError = errorMessage.includes('Syntax error');

              // Gerar resposta de erro amigável
              result = {
                message: isSyntaxError
                  ? `Não foi possível executar a consulta devido a um erro de sintaxe SQL: ${errorMessage}`
                  : `Não foi possível executar a consulta para responder sua pergunta. Ocorreu um erro no BigQuery: ${errorMessage}`,
                metadata: {
                  source: 'error',
                  confidence: 0,
                  processingTimeMs: Date.now() - startTime,
                  error: {
                    type: isSyntaxError ? 'syntax_error' : 'execution_error',
                    details: errorMessage,
                  }
                }
              };

              // Se for um erro de sintaxe, não armazenar no cache
              if (!isSyntaxError) {
                // Armazenar o erro no cache para evitar repetir a mesma consulta problemática
                this.logger.log(`[CACHE] Armazenando erro no cache para evitar repetição`);
                await this.semanticCacheService.storeResult(
                  request.message,
                  {
                    ...result,
                    metadata: {
                      ...result.metadata,
                      needsReview: true
                    }
                  },
                  conversationId,
                  conversationContext
                );
              }
            }
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          this.logger.error(`[ERROR] Erro ao processar pergunta: ${errorMessage}`);

          result = {
            message: `Desculpe, ocorreu um erro ao processar sua pergunta: ${errorMessage}`,
            metadata: {
              source: 'error',
              confidence: 0,
              processingTimeMs: Date.now() - startTime,
              error: {
                type: 'processing_error',
                details: errorMessage,
              }
            }
          };
        }
      }

      // Gerar sugestões de perguntas relacionadas
      const suggestions = await this.generateSuggestions(request.message, result);

      // Registrar mensagem na conversa
      const messageId = uuidv4();

      // Adicionar mensagem do usuário
      conversation.messages.push({
        id: uuidv4(),
        role: 'user',
        content: request.message,
        timestamp: new Date(startTime),
      });

      // Adicionar resposta do assistente
      conversation.messages.push({
        id: messageId,
        role: 'assistant',
        content: result.message,
        originalQuestion: request.message, // Armazenar a pergunta original
        timestamp: new Date(),
        metadata: {
          ...result.metadata,
          processingTimeMs: Date.now() - startTime,
        },
      });

      // Atualizar metadados da conversa
      conversation.metadata.updatedAt = new Date();
      conversation.metadata.totalInteractions += 1;
      conversation.metadata.lastProcessingTimeMs = Date.now() - startTime;

      // Armazenar o último resultado para uso futuro
      conversation.lastResult = result;

      // Construir resposta
      const response: ConversationResponseDto = {
        id: messageId,
        conversationId,
        message: result.message,
        metadata: {
          ...result.metadata,
          confidence: result.metadata.confidence ?? 0.95,
          processingTimeMs: Date.now() - startTime,
        },
        suggestions,
        feedbackOptions: {
          thumbsUp: true,
          thumbsDown: true,
          commentEnabled: true,
        },
      };

      this.logger.log(`[RESPONSE] Resposta gerada em ${Date.now() - startTime}ms. Fonte: ${result.metadata.source}`);
      return response;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`[ERROR] Erro não tratado ao processar conversa: ${errorMessage}`, {
        stack: error instanceof Error ? error.stack : undefined,
      });

      throw new ProcessingError(
        `Ocorreu um erro ao processar sua solicitação: ${errorMessage}`,
        error instanceof Error ? error : new Error(errorMessage)
      );
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

  async processFeedback(request: FeedbackRequestDto): Promise<FeedbackResponseDto> {
    try {
      this.logger.log(`[FEEDBACK] Processando feedback para resposta ${request.responseId}`);

      // Verificar se a conversa existe
      if (!this.conversations.has(request.conversationId)) {
        this.logger.warn(`[FEEDBACK] Conversa ${request.conversationId} não encontrada`);

        // Mesmo sem a conversa, podemos tentar processar o feedback para o cache
        // se tivermos o responseId
        if (request.responseId) {
          this.logger.log(`[FEEDBACK] Tentando processar feedback apenas para o cache usando responseId: ${request.responseId}`);

          try {
            // Tentar atualizar o feedback no cache semântico diretamente
            // Isso funciona se o responseId corresponder a um cacheId válido
            await this.semanticCacheService.updateFeedback(
              request.responseId, // Usando responseId como identificador
              {
                type: request.type,
                helpful: request.helpful,
                comment: request.comment || '',
              }
            );

            this.logger.log(`[FEEDBACK] Feedback processado com sucesso para o cache, mesmo sem a conversa`);
            return {
              id: uuidv4(),
              conversationId: request.conversationId,
              responseId: request.responseId,
              status: 'success',
              message: 'Feedback registrado com sucesso (apenas no cache)'
            };
          } catch (error) {
            this.logger.warn(`[FEEDBACK] Não foi possível processar feedback para o cache: ${error instanceof Error ? error.message : String(error)}`);
          }
        }

        // Se chegamos aqui, não conseguimos processar o feedback nem para o cache
        throw new NotFoundException(`Conversa ${request.conversationId} não encontrada`);
      }

      const conversation = this.conversations.get(request.conversationId);

      // Encontrar a mensagem correspondente
      const message = conversation.messages.find(m => m.id === request.responseId);
      if (!message) {
        throw new NotFoundException(`Mensagem ${request.responseId} não encontrada na conversa ${request.conversationId}`);
      }

      // Verificar se a mensagem tem metadados e cacheId
      if (!message.metadata || !message.metadata.cacheId) {
        this.logger.warn(`[FEEDBACK] Mensagem ${request.responseId} não tem cacheId nos metadados`);

        // Ainda podemos registrar o feedback na conversa
        message.feedback = {
          type: request.type === FeedbackType.POSITIVE ? FeedbackType.POSITIVE : FeedbackType.NEGATIVE,
          helpful: request.helpful,
          comment: request.comment,
          timestamp: new Date()
        };

        conversation.metadata.hasFeedback = true;

        return {
          id: uuidv4(),
          conversationId: request.conversationId,
          responseId: request.responseId,
          status: 'success',
          message: 'Feedback registrado com sucesso (apenas na conversa)'
        };
      }

      // Atualizar feedback no cache semântico
      this.logger.log(`[FEEDBACK] Atualizando feedback no cache semântico para a pergunta: "${message.originalQuestion}"`);

      await this.semanticCacheService.updateFeedback(
        message.metadata.cacheId,
        {
          type: request.type,
          helpful: request.helpful,
          comment: request.comment || '',
        }
      );

      // Atualizar feedback na conversa
      message.feedback = {
        type: request.type === FeedbackType.POSITIVE ? FeedbackType.POSITIVE : FeedbackType.NEGATIVE,
        helpful: request.helpful,
        comment: request.comment,
        timestamp: new Date()
      };

      conversation.metadata.hasFeedback = true;

      this.logger.log(`[FEEDBACK] Feedback atualizado com sucesso no cache semântico`);

      return {
        id: uuidv4(),
        conversationId: request.conversationId,
        responseId: request.responseId,
        status: 'success',
        message: 'Feedback registrado com sucesso'
      };
    } catch (error) {
      this.logger.error(`[FEEDBACK] Erro ao processar feedback: ${error instanceof Error ? error.message : String(error)}`, {
        stack: error instanceof Error ? error.stack : undefined,
        request
      });

      throw error;
    }
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
          comments: t.feedback.comments,
          needsReview: t.feedback.needsReview,
          categories: t.feedback.categories,
          lastFeedbackDate: t.feedback.lastFeedbackDate,
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
        comments: updatedTemplate.feedback.comments,
        needsReview: updatedTemplate.feedback.needsReview,
        categories: updatedTemplate.feedback.categories,
        lastFeedbackDate: updatedTemplate.feedback.lastFeedbackDate,
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
    this.logger.log(`[CONVERSATION] Inicializando nova conversa com ID ${id}`);

    const conversation: ConversationState = {
      id,
      messages: [],
      metadata: {
        createdAt: new Date(),
        updatedAt: new Date(),
        totalInteractions: 0,
        hasFeedback: false,
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

    // Atualizar metadados da conversa
    conversation.metadata.updatedAt = timestamp;
    conversation.metadata.totalInteractions += 1;
    conversation.metadata.lastProcessingTimeMs = result.metadata.processingTimeMs;

    // Armazenar o último resultado para uso futuro
    conversation.lastResult = result;
  }

  private createResponse(
    conversationId: string,
    result: ProcessingResult,
  ): ConversationResponseDto {
    const metadata: QueryMetadataDto = {
      processingTimeMs: result.metadata.processingTimeMs || 0,
      source: result.metadata.source === 'generated' ? 'query' : result.metadata.source,
      confidence: result.metadata.confidence !== undefined ? result.metadata.confidence : 1,
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

  private async generateSuggestions(question: string, result: ProcessingResult): Promise<string[]> {
    // Implementação simples de sugestões
    try {
      // Se o resultado veio do cache, usar as sugestões existentes
      if (result.suggestions && result.suggestions.length > 0) {
        return result.suggestions;
      }

      // Gerar sugestões padrão baseadas no contexto
      const defaultSuggestions = [
        "Como isso se compara com o período anterior?",
        "Quais são as tendências para os próximos meses?",
        "Qual o impacto disso nas vendas totais?"
      ];

      return defaultSuggestions;
    } catch (error) {
      this.logger.warn('Erro ao gerar sugestões, usando padrões', { error });
      return [
        "Como isso se compara com o período anterior?",
        "Quais são as tendências para os próximos meses?",
        "Qual o impacto disso nas vendas totais?"
      ];
    }
  }

  /**
   * Analisa as diferenças entre duas perguntas para determinar se a resposta precisa ser adaptada
   * @param originalQuestion Pergunta original
   * @param currentQuestion Pergunta atual
   * @returns true se a resposta precisa ser adaptada, false caso contrário
   */
  private analyzeQuestionsForAdaptation(originalQuestion: string, currentQuestion: string): boolean {
    this.logger.debug(`[ADAPT] Analisando diferenças entre perguntas para decidir sobre adaptação`);
    this.logger.debug(`[ADAPT] Original: "${originalQuestion}"`);
    this.logger.debug(`[ADAPT] Atual: "${currentQuestion}"`);

    // Normalizar as perguntas
    const normalizedOriginal = originalQuestion.toLowerCase().trim();
    const normalizedCurrent = currentQuestion.toLowerCase().trim();

    // Se as perguntas são idênticas, não precisa adaptar
    if (normalizedOriginal === normalizedCurrent) {
      this.logger.debug(`[ADAPT] Perguntas são idênticas após normalização`);
      return false;
    }

    // Verificar se as perguntas têm o mesmo objetivo
    // Padrões para detectar tipos de consulta
    const topNPattern = /(?:top|melhores|principais)\s+(\d+)\s+produtos?\s+mais\s+vendidos?/i;
    const positionPattern = /(?:primeiro|segundo|terceiro|quarto|quinto|sexto|sétimo|oitavo|nono|décimo|\d+º|\d+°|\d+o)\s+(?:produto|item)\s+mais\s+vendido/i;

    // Verificar se ambas as perguntas são do tipo "top N"
    const originalTopN = normalizedOriginal.match(topNPattern);
    const currentTopN = normalizedCurrent.match(topNPattern);

    if (originalTopN && currentTopN) {
      // Verificar se o N é compatível (o N atual deve ser menor ou igual ao N original)
      const originalN = parseInt(originalTopN[1], 10);
      const currentN = parseInt(currentTopN[1], 10);

      if (currentN <= originalN) {
        this.logger.debug(`[ADAPT] Perguntas são compatíveis para adaptação: top ${currentN} <= top ${originalN}`);
        return true;
      } else {
        this.logger.debug(`[ADAPT] Perguntas não são compatíveis para adaptação: top ${currentN} > top ${originalN}`);
        return false;
      }
    }

    // Verificar se ambas as perguntas são sobre posição específica
    const originalPosition = normalizedOriginal.match(positionPattern);
    const currentPosition = normalizedCurrent.match(positionPattern);

    if (originalPosition && currentPosition) {
      // Posições específicas são compatíveis apenas se forem exatamente iguais
      const areEqual = originalPosition[0] === currentPosition[0];
      this.logger.debug(`[ADAPT] Perguntas sobre posições específicas ${areEqual ? 'são' : 'não são'} compatíveis`);
      return areEqual;
    }

    // Se uma é "top N" e outra é posição específica, verificar compatibilidade
    if (currentPosition && originalTopN) {
      // Extrair a posição da pergunta atual
      const positionMap: Record<string, number> = {
        'primeiro': 1, 'segundo': 2, 'terceiro': 3, 'quarto': 4, 'quinto': 5,
        'sexto': 6, 'sétimo': 7, 'oitavo': 8, 'nono': 9, 'décimo': 10
      };

      let currentN = 0;
      for (const [word, position] of Object.entries(positionMap)) {
        if (currentPosition[0].includes(word)) {
          currentN = position;
          break;
        }
      }

      // Se não encontrou por palavra, tentar por número
      if (currentN === 0) {
        const numMatch = currentPosition[0].match(/(\d+)/);
        if (numMatch) {
          currentN = parseInt(numMatch[1], 10);
        }
      }

      // Verificar se a posição está dentro do top N original
      const originalN = parseInt(originalTopN[1], 10);
      const isCompatible = currentN > 0 && currentN <= originalN;
      this.logger.debug(`[ADAPT] Pergunta sobre posição ${currentN} ${isCompatible ? 'é' : 'não é'} compatível com top ${originalN}`);
      return isCompatible;
    }

    // Verificar se as entidades principais são as mesmas
    // Extrair mês e ano das perguntas
    const monthYearPattern = /(?:em|no|na|nos|nas)\s+(\w+)\s+(?:de\s+)?(\d{4})/i;

    const originalMatch = normalizedOriginal.match(monthYearPattern);
    const currentMatch = normalizedCurrent.match(monthYearPattern);

    // Se ambas têm mês e ano, verificar se são iguais
    if (originalMatch && currentMatch) {
      const originalMonth = originalMatch[1].toLowerCase();
      const originalYear = originalMatch[2];

      const currentMonth = currentMatch[1].toLowerCase();
      const currentYear = currentMatch[2];

      // Mês e ano devem ser exatamente iguais
      const entitiesMatch = originalMonth === currentMonth && originalYear === currentYear;
      this.logger.debug(`[ADAPT] Entidades (mês/ano) ${entitiesMatch ? 'são' : 'não são'} compatíveis`);

      if (!entitiesMatch) {
        return false;
      }
    }

    // Se chegou até aqui, as perguntas são diferentes demais para adaptação segura
    this.logger.debug(`[ADAPT] Perguntas são diferentes demais para adaptação segura`);
    return false;
  }

  /**
   * Extrai números de uma string
   */
  private extractNumbers(text: string): number[] {
    const matches = text.match(/\d+/g);
    return matches ? matches.map(m => parseInt(m, 10)) : [];
  }

  /**
   * Verifica se há diferenças entre dois arrays
   */
  private hasArrayDifference(arr1: any[], arr2: any[]): boolean {
    if (arr1.length !== arr2.length) {
      return true;
    }

    // Ordenar os arrays para comparação
    const sorted1 = [...arr1].sort();
    const sorted2 = [...arr2].sort();

    // Comparar os elementos
    for (let i = 0; i < sorted1.length; i++) {
      if (sorted1[i] !== sorted2[i]) {
        return true;
      }
    }

    return false;
  }

  /**
   * Extrai categorias de palavras-chave de uma string
   */
  private extractKeywordCategories(text: string, patterns: { pattern: RegExp, category: string }[]): { category: string, match: string }[] {
    const results: { category: string, match: string }[] = [];

    for (const { pattern, category } of patterns) {
      const matches = text.match(pattern);
      if (matches) {
        for (const match of matches) {
          results.push({ category, match });
        }
      }
    }

    return results;
  }

  /**
   * Verifica se uma mensagem é apenas conversacional e não requer geração de SQL
   * @param message Mensagem a ser verificada
   * @returns true se a mensagem for conversacional, false caso contrário
   */
  private isConversationalMessage(message: string): boolean {
    // Normalizar a mensagem (remover pontuação, converter para minúsculas)
    const normalizedMessage = message.toLowerCase().trim();

    // Padrões de mensagens conversacionais
    const conversationalPatterns = [
      // Agradecimentos
      /^obrigad[oa]/, /^muito obrigad[oa]/, /^valeu/, /^grat[oa]/, /^thanks/,

      // Confirmações
      /^ok/, /^beleza/, /^entendi/, /^certo/, /^perfeito/, /^exato/, /^excelente/, /^ótimo/,

      // Despedidas
      /^tchau/, /^até/, /^adeus/, /^bye/,

      // Expressões de satisfação
      /^(isso|era|foi) (mesmo|exatamente|justamente) (o que|isso que) (eu queria|eu precisava|eu buscava)/,
      /^(isso|era|foi) (perfeito|excelente|ótimo|bom)/,

      // Mensagens curtas sem contexto de análise
      /^sim$/, /^não$/, /^talvez$/, /^claro$/,

      // Perguntas sobre o chatbot
      /^quem (é|são) você/, /^como você funciona/, /^o que você (faz|pode fazer)/,
      /^me (fale|conte) (sobre|mais sobre) você/,

      // Saudações
      /^olá/, /^oi/, /^e aí/, /^bom dia/, /^boa tarde/, /^boa noite/, /^hey/,

      // Perguntas gerais não relacionadas a dados
      /^como você está/, /^tudo bem/, /^como vai/
    ];

    // Verificar se a mensagem corresponde a algum dos padrões conversacionais
    const isConversational = conversationalPatterns.some(pattern => pattern.test(normalizedMessage));

    // Verificar se a mensagem é muito curta (menos de 5 palavras) e não contém palavras-chave de análise
    if (!isConversational && normalizedMessage.split(/\s+/).length < 5) {
      const dataAnalysisKeywords = [
        'vendas', 'produtos', 'pedidos', 'clientes', 'faturamento',
        'ticket', 'médio', 'região', 'período', 'comparar', 'top', 'melhores',
        'piores', 'crescimento', 'queda', 'aumento', 'diminuição', 'tendência',
        'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho',
        'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'
      ];

      // Se não contiver palavras-chave de análise, considerar como conversacional
      return !dataAnalysisKeywords.some(keyword => normalizedMessage.includes(keyword));
    }

    return isConversational;
  }

  /**
   * Classifica o tipo de mensagem conversacional
   * @param message Mensagem do usuário
   * @returns Tipo da mensagem conversacional
   */
  private classifyConversationalMessage(message: string): 'greeting' | 'farewell' | 'thanks' | 'satisfaction' | 'about_bot' | 'general' {
    const normalizedMessage = message.toLowerCase().trim();

    if (/^olá|^oi|^e aí|^bom dia|^boa tarde|^boa noite|^hey/.test(normalizedMessage)) {
      return 'greeting';
    }

    if (/tchau|até|adeus|bye/.test(normalizedMessage)) {
      return 'farewell';
    }

    if (/obrigad[oa]|valeu|grat[oa]|thanks/.test(normalizedMessage)) {
      return 'thanks';
    }

    if (/perfeito|excelente|ótimo|exato|^(isso|era|foi) (mesmo|exatamente|justamente)/.test(normalizedMessage)) {
      return 'satisfaction';
    }

    if (/quem (é|são) você|como você funciona|o que você (faz|pode fazer)|me (fale|conte) (sobre|mais sobre) você/.test(normalizedMessage)) {
      return 'about_bot';
    }

    return 'general';
  }

  /**
   * Gera uma resposta conversacional contextual baseada na mensagem do usuário e no histórico da conversa
   * @param message Mensagem do usuário
   * @param conversation Estado atual da conversa
   * @returns Resultado do processamento com a resposta conversacional
   */
  private async generateConversationalResponse(message: string, conversation: ConversationState): Promise<ProcessingResult> {
    const startTime = Date.now();

    // Classificar o tipo de mensagem
    const messageType = this.classifyConversationalMessage(message);

    // Obter o último resultado para manter contexto
    const lastResult = conversation.lastResult;
    const lastAssistantMessage = conversation.messages
      .filter(m => m.role === 'assistant')
      .pop()?.content || '';

    let responseMessage = '';

    // Gerar resposta baseada no tipo de mensagem
    switch (messageType) {
      case 'greeting':
        responseMessage = "Olá! Sou o GPTrue, seu assistente de análise de dados do e-commerce. Como posso ajudar você hoje?";
        break;

      case 'farewell':
        responseMessage = "Foi um prazer ajudar! Se precisar de mais análises de dados, estarei à disposição. Até a próxima!";
        break;

      case 'thanks':
        responseMessage = "Por nada! Estou aqui para ajudar com suas análises de dados. Tem mais alguma pergunta sobre o e-commerce?";
        break;

      case 'satisfaction':
        responseMessage = "Fico feliz que a informação tenha sido útil! Posso ajudar com mais alguma análise de dados?";
        break;

      case 'about_bot':
        responseMessage = "Sou o GPTrue, um assistente de análise de dados especializado no e-commerce da True. " +
                         "Posso ajudar você a obter insights sobre vendas, produtos, clientes e muito mais, " +
                         "transformando suas perguntas em linguagem natural em consultas SQL e apresentando os resultados de forma clara e objetiva.";
        break;

      case 'general':
      default:
        responseMessage = "Entendi! Estou aqui para ajudar com suas análises de dados do e-commerce. Tem alguma outra pergunta ou análise que gostaria de fazer?";
        break;
    }

    // Sugestões contextuais baseadas no último resultado
    let suggestions: string[] = [];

    if (lastResult) {
      // Se temos um resultado anterior, oferecemos sugestões relacionadas
      if (lastResult.metadata.source === 'cache' || lastResult.metadata.source === 'generated') {
        // Se o último resultado foi uma consulta de dados, sugerimos análises relacionadas
        suggestions = lastResult.suggestions || [
          "Pode me mostrar mais detalhes sobre esses dados?",
          "Como isso se compara com o período anterior?",
          "Quais são as tendências para os próximos meses?"
        ];
      } else {
        // Sugestões genéricas para análise de dados
        suggestions = [
          "Quais são os produtos mais vendidos este mês?",
          "Qual é o ticket médio dos pedidos?",
          "Como estão as vendas por região?"
        ];
      }
    } else {
      // Sugestões iniciais se não houver contexto anterior
      suggestions = [
        "Quais são os produtos mais vendidos?",
        "Como estão as vendas por região?",
        "Qual o ticket médio dos pedidos?"
      ];
    }

    return {
      message: responseMessage,
      metadata: {
        source: 'conversational',
        confidence: 1.0,
        processingTimeMs: Date.now() - startTime
      },
      suggestions
    };
  }

  /**
   * Verifica se a mensagem é uma pergunta geral sobre e-commerce que não requer consulta SQL
   * @param message Mensagem a ser verificada
   * @returns true se for uma pergunta geral sobre e-commerce, false caso contrário
   */
  private isGeneralEcommerceQuestion(message: string): boolean {
    const normalizedMessage = message.toLowerCase().trim();

    // Padrões de perguntas gerais sobre e-commerce
    const generalEcommercePatterns = [
      // Perguntas sobre o funcionamento do e-commerce
      /como funciona (o|um) e-commerce/,
      /o que (é|significa) (o|um) e-commerce/,

      // Perguntas sobre métricas e KPIs
      /o que (é|significa) (o|um) ticket médio/,
      /como (calcular|calcular o|se calcula) (o|um) ticket médio/,
      /o que (é|significa) (a|uma) taxa de conversão/,
      /o que (é|significa) (o|um) CAC/,
      /o que (é|significa) (o|um) LTV/,

      // Perguntas sobre estratégias
      /como (melhorar|aumentar) (as|minhas) vendas/,
      /quais (são|seriam) (as|algumas) estratégias para (melhorar|aumentar) (as|minhas) vendas/,
      /como (reduzir|diminuir) (o|a) (taxa de|) abandono de carrinho/,

      // Perguntas sobre tendências
      /quais (são|seriam) (as|algumas) tendências (de|do|para o) e-commerce/,
      /o que está em alta no e-commerce/
    ];

    return generalEcommercePatterns.some(pattern => pattern.test(normalizedMessage));
  }

  /**
   * Gera uma resposta para perguntas gerais sobre e-commerce
   * @param message Pergunta do usuário
   * @param conversation Estado atual da conversa
   * @returns Resultado do processamento com a resposta
   */
  private async generateGeneralEcommerceResponse(message: string, conversation: ConversationState): Promise<ProcessingResult> {
    const startTime = Date.now();
    const normalizedMessage = message.toLowerCase().trim();

    let responseMessage = '';
    let suggestions: string[] = [];

    // Respostas para perguntas comuns sobre e-commerce
    if (/como funciona (o|um) e-commerce/.test(normalizedMessage) || /o que (é|significa) (o|um) e-commerce/.test(normalizedMessage)) {
      responseMessage = "O e-commerce, ou comércio eletrônico, é a compra e venda de produtos ou serviços pela internet. " +
                       "No contexto da True, nosso e-commerce opera com um modelo de venda direta ao consumidor (D2C), " +
                       "oferecendo produtos de saúde e bem-estar através de nossa plataforma online. " +
                       "Os dados que analiso incluem informações sobre pedidos, produtos, clientes e vendas.";

      suggestions = [
        "Quais são os produtos mais vendidos no e-commerce?",
        "Como está o desempenho do e-commerce este mês?",
        "Qual é o ticket médio dos pedidos?"
      ];
    }
    else if (/o que (é|significa) (o|um) ticket médio/.test(normalizedMessage) || /como (calcular|calcular o|se calcula) (o|um) ticket médio/.test(normalizedMessage)) {
      responseMessage = "O ticket médio é o valor médio gasto pelos clientes em cada compra. " +
                       "É calculado dividindo o faturamento total pelo número de pedidos em um determinado período. " +
                       "Este é um indicador importante para avaliar o desempenho de vendas e a eficácia de estratégias de upsell e cross-sell.";

      suggestions = [
        "Qual é o ticket médio atual do e-commerce?",
        "Como o ticket médio evoluiu nos últimos meses?",
        "Quais produtos contribuem mais para o ticket médio?"
      ];
    }
    else if (/o que (é|significa) (a|uma) taxa de conversão/.test(normalizedMessage)) {
      responseMessage = "A taxa de conversão é a porcentagem de visitantes do site que realizam uma compra. " +
                       "É calculada dividindo o número de conversões (geralmente compras) pelo número total de visitantes, " +
                       "multiplicado por 100. Uma taxa de conversão saudável para e-commerce geralmente varia entre 2% e 5%, " +
                       "dependendo do segmento.";

      suggestions = [
        "Qual é a taxa de conversão atual do e-commerce?",
        "Quais produtos têm a maior taxa de conversão?",
        "Como a taxa de conversão se compara com o período anterior?"
      ];
    }
    else if (/como (melhorar|aumentar) (as|minhas) vendas/.test(normalizedMessage) || /quais (são|seriam) (as|algumas) estratégias para (melhorar|aumentar) (as|minhas) vendas/.test(normalizedMessage)) {
      responseMessage = "Para melhorar as vendas no e-commerce, algumas estratégias eficazes incluem: " +
                       "1) Otimizar a experiência do usuário no site; " +
                       "2) Implementar estratégias de marketing digital eficientes; " +
                       "3) Oferecer promoções e descontos estratégicos; " +
                       "4) Melhorar o processo de checkout para reduzir abandono de carrinho; " +
                       "5) Investir em remarketing para recuperar clientes potenciais. " +
                       "Posso ajudar você a analisar dados para identificar oportunidades específicas para o seu caso.";

      suggestions = [
        "Quais produtos têm maior potencial de crescimento?",
        "Qual é a taxa de abandono de carrinho atual?",
        "Quais canais de marketing trazem mais vendas?"
      ];
    }
    else if (/quais (são|seriam) (as|algumas) tendências (de|do|para o) e-commerce/.test(normalizedMessage) || /o que está em alta no e-commerce/.test(normalizedMessage)) {
      responseMessage = "Algumas tendências atuais no e-commerce incluem: " +
                       "1) Comércio social e integração com redes sociais; " +
                       "2) Personalização da experiência do cliente com IA; " +
                       "3) Sustentabilidade e produtos eco-friendly; " +
                       "4) Realidade aumentada para visualização de produtos; " +
                       "5) Opções de pagamento flexíveis como PIX e Buy Now, Pay Later. " +
                       "No contexto da True, podemos analisar quais dessas tendências estão impactando mais o desempenho do e-commerce.";

      suggestions = [
        "Quais produtos sustentáveis têm melhor desempenho?",
        "Como as vendas por dispositivos móveis evoluíram?",
        "Qual o impacto do PIX nas vendas?"
      ];
    }
    else {
      // Resposta genérica para outras perguntas sobre e-commerce
      responseMessage = "Esta é uma pergunta interessante sobre e-commerce. Para fornecer insights mais precisos, " +
                       "eu precisaria analisar dados específicos. Posso ajudar você a explorar métricas como vendas, " +
                       "produtos mais populares, comportamento do cliente e tendências de mercado com base nos dados disponíveis. " +
                       "Gostaria de fazer uma consulta específica sobre algum desses aspectos?";

      suggestions = [
        "Quais são os produtos mais vendidos?",
        "Como está o desempenho de vendas este mês?",
        "Qual é o perfil dos clientes que mais compram?"
      ];
    }

    return {
      message: responseMessage,
      metadata: {
        source: 'conversational',
        confidence: 0.9,
        processingTimeMs: Date.now() - startTime
      },
      suggestions
    };
  }

  /**
   * Verifica se a pergunta atual é um subconjunto de uma pergunta anterior em cache
   * @param message Pergunta atual
   * @param conversation Estado da conversa
   * @returns Resultado processado do subconjunto ou null se não for um subconjunto
   */
  private async checkForSubsetQuery(message: string, conversation: ConversationState): Promise<ProcessingResult | null> {
    const normalizedMessage = message.toLowerCase().trim();

    this.logger.debug(`[SUBSET] Analisando se a pergunta é um subconjunto: "${normalizedMessage}"`);

    // Padrões para detectar consultas de "top N"
    const topNPattern = /top\s+(\d+)\s+produtos?\s+mais\s+vendidos?\s+(?:em|no|na|nos|nas)\s+(\w+)\s+(?:de\s+)?(\d{4})/i;
    const matchTopN = normalizedMessage.match(topNPattern);

    // Padrões para detectar consultas sobre posição específica (ex: "segundo produto mais vendido")
    const positionPattern = /(?:qual|quais|o|os|me\s+mostre|buscar|busque|encontre|encontrar)\s+(?:foi|foram|é|são|era|eram)?\s+(?:o|a|os|as)?\s*(?:(\d+)(?:º|°|o)?|primeiro|segundo|terceiro|quarto|quinto|sexto|sétimo|oitavo|nono|décimo)\s+(?:produto|item|produtos|itens)?\s+mais\s+vendidos?\s+(?:em|no|na|nos|nas)\s+(\w+)\s+(?:de\s+)?(\d{4})/i;
    const matchPosition = normalizedMessage.match(positionPattern);

    // Padrão simplificado para detectar consultas sobre posição específica (ex: "qual segundo produto mais vendido")
    const simplePositionPattern = /(?:qual|quais|você\s+deve\s+buscar)\s+(?:o|a|os|as)?\s*(?:(\d+)(?:º|°|o)?|primeiro|segundo|terceiro|quarto|quinto|sexto|sétimo|oitavo|nono|décimo)\s+(?:produto|item|produtos|itens)?\s+mais\s+vendidos?\s+(?:em|no|na|nos|nas)?\s*(\w+)?\s*(?:de\s+)?(\d{4})?/i;
    const matchSimplePosition = normalizedMessage.match(simplePositionPattern);

    // Padrão mais genérico para detectar consultas sobre produtos mais vendidos
    const genericPattern = /(?:produtos?|itens?)\s+mais\s+vendidos?\s+(?:em|no|na|nos|nas)\s+(\w+)\s+(?:de\s+)?(\d{4})/i;
    const matchGeneric = normalizedMessage.match(genericPattern);

    // Padrão ainda mais genérico para detectar qualquer menção a produto mais vendido
    const veryGenericPattern = /(?:qual|quais|o|os|me\s+mostre|buscar|busque|encontre|encontrar)\s+(?:foi|foram|é|são|era|eram)?\s+(?:o|a)?\s*(?:produto|item)?\s+mais\s+vendido\s+(?:em|no|na|nos|nas)\s+(\w+)\s+(?:de\s+)?(\d{4})/i;
    const matchVeryGeneric = normalizedMessage.match(veryGenericPattern);

    let currentTopN = 0;
    let currentMonth = '';
    let currentYear = '';
    let positionDetected = false;

    if (matchTopN) {
      this.logger.debug(`[SUBSET] Detectado padrão "top N": ${matchTopN[0]}`);
      currentTopN = parseInt(matchTopN[1], 10);
      currentMonth = matchTopN[2];
      currentYear = matchTopN[3];
    } else if (matchPosition) {
      this.logger.debug(`[SUBSET] Detectado padrão de posição específica: ${matchPosition[0]}`);
      positionDetected = true;
      // Converter posição textual para número
      const positionText = matchPosition[1]?.toLowerCase() || '';
      if (positionText.match(/\d+/)) {
        currentTopN = parseInt(positionText, 10);
      } else {
        const positionMap: Record<string, number> = {
          'primeiro': 1, 'segundo': 2, 'terceiro': 3, 'quarto': 4, 'quinto': 5,
          'sexto': 6, 'sétimo': 7, 'oitavo': 8, 'nono': 9, 'décimo': 10
        };

        // Procurar por palavras de posição no texto completo
        for (const [word, position] of Object.entries(positionMap)) {
          if (normalizedMessage.includes(word)) {
            currentTopN = position;
            this.logger.debug(`[SUBSET] Encontrada posição textual: "${word}" -> ${position}`);
            break;
          }
        }
      }

      // Se encontramos uma posição, precisamos do mês e ano
      if (currentTopN > 0) {
        currentMonth = matchPosition[2];
        currentYear = matchPosition[3];
      }
    } else if (matchSimplePosition) {
      this.logger.debug(`[SUBSET] Detectado padrão simplificado de posição: ${matchSimplePosition[0]}`);
      positionDetected = true;
      // Converter posição textual para número
      const positionText = matchSimplePosition[1]?.toLowerCase() || '';
      if (positionText.match(/\d+/)) {
        currentTopN = parseInt(positionText, 10);
      } else {
        const positionMap: Record<string, number> = {
          'primeiro': 1, 'segundo': 2, 'terceiro': 3, 'quarto': 4, 'quinto': 5,
          'sexto': 6, 'sétimo': 7, 'oitavo': 8, 'nono': 9, 'décimo': 10
        };

        // Procurar por palavras de posição no texto completo
        for (const [word, position] of Object.entries(positionMap)) {
          if (normalizedMessage.includes(word)) {
            currentTopN = position;
            this.logger.debug(`[SUBSET] Encontrada posição textual: "${word}" -> ${position}`);
            break;
          }
        }
      }

      // Se encontramos uma posição, precisamos do mês e ano
      if (currentTopN > 0) {
        currentMonth = matchSimplePosition[2] || 'janeiro'; // Valor padrão se não especificado
        currentYear = matchSimplePosition[3] || '2025'; // Valor padrão se não especificado

        // Se não temos mês ou ano, tentar extrair do contexto da mensagem
        if (!currentMonth || !currentYear) {
          // Tentar extrair mês e ano da mensagem
          const monthYearPattern = /(?:em|no|na|nos|nas)\s+(\w+)\s+(?:de\s+)?(\d{4})/i;
          const monthYearMatch = normalizedMessage.match(monthYearPattern);

          if (monthYearMatch) {
            if (!currentMonth) currentMonth = monthYearMatch[1];
            if (!currentYear) currentYear = monthYearMatch[2];
          }
        }
      }
    } else if (matchGeneric) {
      // Para consultas genéricas sobre produtos mais vendidos, assumimos que queremos o top 1
      this.logger.debug(`[SUBSET] Detectado padrão genérico de produtos mais vendidos: ${matchGeneric[0]}`);
      currentTopN = 1;
      currentMonth = matchGeneric[1];
      currentYear = matchGeneric[2];
    } else if (matchVeryGeneric) {
      // Para consultas muito genéricas sobre o produto mais vendido
      this.logger.debug(`[SUBSET] Detectado padrão muito genérico de produto mais vendido: ${matchVeryGeneric[0]}`);
      currentTopN = 1;
      currentMonth = matchVeryGeneric[1];
      currentYear = matchVeryGeneric[2];
    }

    // Se não conseguimos extrair informações suficientes, não é uma consulta que podemos processar
    if (currentTopN <= 0) {
      this.logger.debug(`[SUBSET] Não foi possível extrair o número de produtos. TopN: ${currentTopN}`);
      return null;
    }

    // Se não temos mês ou ano, usar valores padrão
    if (!currentMonth) {
      currentMonth = 'janeiro';
      this.logger.debug(`[SUBSET] Usando mês padrão: ${currentMonth}`);
    }

    if (!currentYear) {
      currentYear = '2025';
      this.logger.debug(`[SUBSET] Usando ano padrão: ${currentYear}`);
    }

    this.logger.debug(`[SUBSET] Detectada consulta para posição/top ${currentTopN} em ${currentMonth}/${currentYear}`);

    // Buscar todas as mensagens anteriores do assistente
    const allPreviousResponses = conversation.messages
      .filter(m => m.role === 'assistant' && (m.metadata?.source === 'cache' || m.metadata?.source === 'generated'));

    this.logger.debug(`[SUBSET] Encontradas ${allPreviousResponses.length} respostas anteriores do assistente para análise`);

    // Verificar cada resposta anterior para ver se contém informações sobre os produtos mais vendidos
    for (const prevResponse of allPreviousResponses) {
      const prevNormalizedMessage = prevResponse.content.toLowerCase().trim();
      const userMessage = this.findUserMessageBeforeAssistantMessage(conversation, prevResponse.id);

      if (!userMessage) {
        this.logger.debug(`[SUBSET] Não foi possível encontrar a mensagem do usuário correspondente à resposta ${prevResponse.id}`);
        continue;
      }

      // Extrair o número de produtos da mensagem anterior
      let prevTopN = 0;
      const prevNormalizedQuestion = userMessage.content.toLowerCase().trim();

      // Verificar se a mensagem anterior é uma consulta de "top N"
      const prevMatchTopN = prevNormalizedQuestion.match(topNPattern);
      if (prevMatchTopN) {
        prevTopN = parseInt(prevMatchTopN[1], 10);
      } else {
        // Tentar extrair posição específica
        const prevMatchPosition = prevNormalizedQuestion.match(positionPattern);
        if (prevMatchPosition) {
          const positionText = prevMatchPosition[1]?.toLowerCase() || '';
          if (positionText.match(/\d+/)) {
            prevTopN = parseInt(positionText, 10);
          } else {
            const positionMap: Record<string, number> = {
              'primeiro': 1, 'segundo': 2, 'terceiro': 3, 'quarto': 4, 'quinto': 5,
              'sexto': 6, 'sétimo': 7, 'oitavo': 8, 'nono': 9, 'décimo': 10
            };

            for (const [word, position] of Object.entries(positionMap)) {
              if (prevNormalizedQuestion.includes(word)) {
                prevTopN = position;
                break;
              }
            }
          }
        } else {
          // Tentar extrair posição simplificada
          const prevMatchSimplePosition = prevNormalizedQuestion.match(simplePositionPattern);
          if (prevMatchSimplePosition) {
            const positionText = prevMatchSimplePosition[1]?.toLowerCase() || '';
            if (positionText.match(/\d+/)) {
              prevTopN = parseInt(positionText, 10);
            } else {
              const positionMap: Record<string, number> = {
                'primeiro': 1, 'segundo': 2, 'terceiro': 3, 'quarto': 4, 'quinto': 5,
                'sexto': 6, 'sétimo': 7, 'oitavo': 8, 'nono': 9, 'décimo': 10
              };

              for (const [word, position] of Object.entries(positionMap)) {
                if (prevNormalizedQuestion.includes(word)) {
                  prevTopN = position;
                  break;
                }
              }
            }
          } else {
            // Para consultas genéricas, assumir top 1
            if (prevNormalizedQuestion.match(genericPattern) || prevNormalizedQuestion.match(veryGenericPattern)) {
              prevTopN = 1;
            }
          }
        }
      }

      // Extrair mês e ano da mensagem anterior
      let prevMonth = '';
      let prevYear = '';
      const monthYearPattern = /(?:em|no|na|nos|nas)\s+(\w+)\s+(?:de\s+)?(\d{4})/i;
      const monthYearMatch = prevNormalizedQuestion.match(monthYearPattern);
      if (monthYearMatch) {
        prevMonth = monthYearMatch[1];
        prevYear = monthYearMatch[2];
      }

      // Se não conseguimos extrair o número de produtos, não podemos comparar
      if (prevTopN <= 0) {
        this.logger.debug(`[SUBSET] Não foi possível extrair o número de produtos da mensagem anterior`);
        continue;
      }

      // Se não temos mês ou ano, usar valores padrão
      if (!prevMonth) {
        prevMonth = currentMonth;
        this.logger.debug(`[SUBSET] Usando mês atual como padrão para mensagem anterior: ${prevMonth}`);
      }

      if (!prevYear) {
        prevYear = currentYear;
        this.logger.debug(`[SUBSET] Usando ano atual como padrão para mensagem anterior: ${prevYear}`);
      }

      // Verificar se o conteúdo da resposta contém informações sobre produtos
      const productLinePattern = /(?:🥇|🥈|🥉|[0-9]+\.)\s+\*\*([^*]+)\*\*\s+-\s+([0-9.,]+)\s+unidades/gi;
      const matches = [...prevResponse.content.matchAll(productLinePattern)];

      this.logger.debug(`[SUBSET] Encontrados ${matches.length} produtos na resposta anterior`);

      // Verificar se é o mesmo mês e ano, e se temos produtos suficientes na resposta anterior
      if (prevMonth.toLowerCase() === currentMonth.toLowerCase() &&
          prevYear === currentYear &&
          matches.length >= currentTopN) {

        // Verificação adicional: garantir que a consulta atual é um subconjunto da anterior
        // Se a consulta atual é "top N", a anterior deve ser "top M" com M >= N
        // Se a consulta atual é posição específica, a anterior deve ser "top M" com M >= posição
        if (currentTopN > prevTopN) {
          this.logger.debug(`[SUBSET] A consulta atual (top/posição ${currentTopN}) não é um subconjunto da anterior (top/posição ${prevTopN})`);
          continue;
        }

        // Verificação adicional: se a pergunta atual é sobre uma posição específica,
        // garantir que estamos retornando a posição correta
        if (positionDetected) {
          this.logger.debug(`[SUBSET] Pergunta atual é sobre posição específica: ${currentTopN}`);

          // Verificar se temos informações suficientes para a posição solicitada
          if (matches.length < currentTopN) {
            this.logger.debug(`[SUBSET] Não há produtos suficientes (${matches.length}) para a posição solicitada (${currentTopN})`);
            continue;
          }

          this.logger.log(`[SUBSET] Encontrado resultado em cache para top/posição ${prevTopN} que pode ser adaptado para posição específica ${currentTopN}`);
        } else {
          this.logger.log(`[SUBSET] Encontrado resultado em cache para top/posição ${prevTopN} que pode ser adaptado para top ${currentTopN}`);
        }

        this.logger.debug(`[SUBSET] Detalhes da correspondência: PrevTopN: ${prevTopN}, CurrentTopN: ${currentTopN}, PrevMonth: ${prevMonth}, CurrentMonth: ${currentMonth}, PrevYear: ${prevYear}, CurrentYear: ${currentYear}, Produtos: ${matches.length}`);

        // Extrair os dados do resultado anterior
        const prevMetadata = prevResponse.metadata;
        const prevContent = prevResponse.content;

        // Verificar se o conteúdo tem informações sobre o produto na posição solicitada
        const productInfo = this.extractProductInfo(prevContent, currentTopN);
        if (!productInfo || !productInfo.name || !productInfo.quantity) {
          this.logger.debug(`[SUBSET] Não foi possível extrair informações sobre o produto na posição ${currentTopN}`);
          continue;
        }

        // Adaptar o resultado para mostrar apenas o item na posição específica
        const adaptedResult = await this.adaptPositionResult(prevContent, currentTopN, prevTopN);

        return {
          message: adaptedResult,
          metadata: {
            source: 'cache',
            confidence: 0.98,
            processingTimeMs: 50, // Processamento rápido pois é apenas adaptação
            adaptedFromCache: true,
            originalQuestion: userMessage.content,
            currentQuestion: message,
            cacheId: prevMetadata?.cacheId,
            sql: prevMetadata?.sql,
            tables: prevMetadata?.tables
          },
          suggestions: [
            `Como o ${this.getPositionText(currentTopN)} produto mais vendido se compara com o mês anterior?`,
            `Qual o faturamento total desse produto?`,
            `Quais são as características desse produto?`
          ]
        };
      } else {
        this.logger.debug(`[SUBSET] Resposta anterior não é adequada. PrevTopN: ${prevTopN}, CurrentTopN: ${currentTopN}, PrevMonth: ${prevMonth}, CurrentMonth: ${currentMonth}, PrevYear: ${prevYear}, CurrentYear: ${currentYear}, Produtos: ${matches.length}`);
      }
    }

    this.logger.debug(`[SUBSET] Não foi encontrado um resultado em cache adequado para adaptação`);
    return null; // Não encontrou um resultado em cache adequado para adaptação
  }

  /**
   * Extrai informações sobre um produto específico de um conteúdo
   * @param content Conteúdo da resposta
   * @param position Posição do produto (começando em 1)
   * @returns Informações do produto ou null se não encontrado
   */
  private extractProductInfo(content: string, position: number): { name: string, quantity: string } | null {
    this.logger.debug(`[EXTRACT] Extraindo informações do produto na posição ${position} do conteúdo`);

    // Padrão para extrair linhas de produtos em formato markdown
    const productLinePattern = /(?:🥇|🥈|🥉|[0-9]+\.)\s+\*\*([^*]+)\*\*\s+-\s+([0-9.,]+)\s+unidades/gi;

    // Extrair todas as linhas de produtos
    const matches = [...content.matchAll(productLinePattern)];

    this.logger.debug(`[EXTRACT] Encontrados ${matches.length} produtos no conteúdo usando padrão principal`);

    // Se não encontramos produtos suficientes com o padrão principal, tentar padrões alternativos
    if (matches.length < position) {
      this.logger.debug(`[EXTRACT] Não há produtos suficientes com o padrão principal. Tentando padrões alternativos.`);

      // Padrão alternativo 1: produtos sem medalhas
      const altPattern1 = /([0-9]+)\.\s+\*\*([^*]+)\*\*\s+-\s+([0-9.,]+)\s+unidades/gi;
      const altMatches1 = [...content.matchAll(altPattern1)];

      if (altMatches1.length >= position) {
        const match = altMatches1[position - 1];
        if (match && match[2] && match[3]) {
          const name = match[2].trim();
          const quantity = match[3].trim();
          this.logger.debug(`[EXTRACT] Produto extraído (padrão alternativo 1): "${name}" - ${quantity} unidades`);
          return { name, quantity };
        }
      }

      // Padrão alternativo 2: produtos com formato diferente
      const altPattern2 = /(?:🥇|🥈|🥉|[0-9]+\.)\s+\*\*([^*]+)\*\*.*?([0-9.,]+)\s+unidades/gi;
      const altMatches2 = [...content.matchAll(altPattern2)];

      if (altMatches2.length >= position) {
        const match = altMatches2[position - 1];
        if (match && match[1] && match[2]) {
          const name = match[1].trim();
          const quantity = match[2].trim();
          this.logger.debug(`[EXTRACT] Produto extraído (padrão alternativo 2): "${name}" - ${quantity} unidades`);
          return { name, quantity };
        }
      }

      // Padrão alternativo 3: extração por linhas
      const lines = content.split('\n');
      const productLines = lines.filter(line =>
        line.includes('unidades') &&
        (line.includes('**') || line.includes('🥇') || line.includes('🥈') || line.includes('🥉'))
      );

      if (productLines.length >= position) {
        const line = productLines[position - 1];
        const nameMatch = line.match(/\*\*([^*]+)\*\*/);
        const quantityMatch = line.match(/([0-9.,]+)\s+unidades/);

        if (nameMatch && nameMatch[1] && quantityMatch && quantityMatch[1]) {
          const name = nameMatch[1].trim();
          const quantity = quantityMatch[1].trim();
          this.logger.debug(`[EXTRACT] Produto extraído (análise de linha): "${name}" - ${quantity} unidades`);
          return { name, quantity };
        }
      }

      this.logger.debug(`[EXTRACT] Não foi possível extrair informações do produto na posição ${position} usando padrões alternativos`);
      return null;
    }

    // Obter o produto na posição específica (índice = posição - 1)
    const match = matches[position - 1];

    if (!match || !match[1] || !match[2]) {
      // Tentar extrair usando uma abordagem alternativa
      const fullText = match ? match[0] : '';
      const parts = fullText.split('**');

      if (parts.length >= 3) {
        const name = parts[1].trim();
        const quantityMatch = parts[2].match(/([0-9.,]+)\s+unidades/);

        if (name && quantityMatch && quantityMatch[1]) {
          const quantity = quantityMatch[1].trim();
          this.logger.debug(`[EXTRACT] Produto extraído (alternativo): "${name}" - ${quantity} unidades`);
          return { name, quantity };
        }
      }

      this.logger.debug(`[EXTRACT] Não foi possível extrair informações do produto na posição ${position}`);
      return null;
    }

    const name = match[1].trim();
    const quantity = match[2].trim();

    this.logger.debug(`[EXTRACT] Produto extraído: "${name}" - ${quantity} unidades`);
    return { name, quantity };
  }

  /**
   * Converte um número de posição em texto (ex: 1 -> "primeiro")
   * @param position Número da posição
   * @returns Texto da posição
   */
  private getPositionText(position: number): string {
    const positionTexts = [
      'primeiro', 'segundo', 'terceiro', 'quarto', 'quinto',
      'sexto', 'sétimo', 'oitavo', 'nono', 'décimo'
    ];

    return position > 0 && position <= positionTexts.length
      ? positionTexts[position - 1]
      : `${position}º`;
  }

  /**
   * Adapta um resultado para mostrar apenas o item na posição específica
   * @param content Conteúdo da resposta original
   * @param position Posição desejada (começando em 1)
   * @param originalTopN Valor original de N
   * @returns Conteúdo adaptado
   */
  private async adaptPositionResult(content: string, position: number, originalTopN: number): Promise<string> {
    this.logger.debug(`[ADAPT] Adaptando resultado para mostrar apenas o produto na posição ${position}`);
    this.logger.debug(`[ADAPT] Conteúdo original: "${content.substring(0, 100)}..."`);

    // Extrair informações do produto na posição solicitada
    const productInfo = this.extractProductInfo(content, position);

    // Se não conseguimos extrair informações suficientes, retornar mensagem de erro
    if (!productInfo || !productInfo.name || !productInfo.quantity) {
      this.logger.debug(`[ADAPT] Não foi possível extrair informações do produto na posição ${position}`);
      return `Não foi possível encontrar o ${this.getPositionText(position)} produto mais vendido nos dados disponíveis.`;
    }

    this.logger.debug(`[ADAPT] Produto selecionado na posição ${position}: "${productInfo.name}" - ${productInfo.quantity} unidades`);

    // Extrair o mês e ano do conteúdo original
    const monthYearPattern = /(?:em|no|na|nos|nas)\s+(\w+)\s+(?:de\s+)?(\d{4})/i;
    const monthYearMatch = content.match(monthYearPattern);

    let month = 'janeiro';
    let year = '2025';

    if (monthYearMatch && monthYearMatch[1] && monthYearMatch[2]) {
      month = monthYearMatch[1].toLowerCase();
      year = monthYearMatch[2];
      this.logger.debug(`[ADAPT] Extraído mês e ano do conteúdo: ${month} de ${year}`);
    }

    // Construir a nova resposta
    let newContent = `O ${this.getPositionText(position)} produto mais vendido em ${month} de ${year} foi:\n\n`;

    // Adicionar apenas o produto na posição solicitada com a formatação apropriada
    if (position === 1) {
      newContent += `🥇 **${productInfo.name}** - ${productInfo.quantity} unidades`;
    } else if (position === 2) {
      newContent += `🥈 **${productInfo.name}** - ${productInfo.quantity} unidades`;
    } else if (position === 3) {
      newContent += `🥉 **${productInfo.name}** - ${productInfo.quantity} unidades`;
    } else {
      newContent += `**${productInfo.name}** - ${productInfo.quantity} unidades`;
    }

    this.logger.debug(`[ADAPT] Conteúdo adaptado: "${newContent}"`);

    return newContent;
  }

  /**
   * Encontra a mensagem do usuário que precedeu uma mensagem específica do assistente
   * @param conversation Estado da conversa
   * @param assistantMessageId ID da mensagem do assistente
   * @returns Mensagem do usuário ou null se não encontrada
   */
  private findUserMessageBeforeAssistantMessage(conversation: ConversationState, assistantMessageId: string): ConversationMessage | null {
    const messages = conversation.messages;
    const assistantIndex = messages.findIndex(m => m.id === assistantMessageId);

    if (assistantIndex <= 0) return null;

    // A mensagem do usuário deve ser a imediatamente anterior
    const userMessage = messages[assistantIndex - 1];
    return userMessage.role === 'user' ? userMessage : null;
  }
}
