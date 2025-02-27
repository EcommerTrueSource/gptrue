import { Test, TestingModule } from '@nestjs/testing';
import { ConversationController } from '../../src/modules/api-gateway/controllers/conversation.controller';
import { OrchestratorService } from '../../src/modules/orchestrator/services/orchestrator.service';
import { SemanticCacheService } from '../../src/modules/semantic-cache/services/semantic-cache.service';
import { QueryGeneratorService } from '../../src/modules/query-generator/services/query-generator.service';
import { QueryValidatorService } from '../../src/modules/query-validator/services/query-validator.service';
import { ResponseGeneratorService } from '../../src/modules/response-generator/services/response-generator.service';
import { FeedbackService } from '../../src/modules/feedback/services/feedback.service';
import {
  MockOrchestratorService,
  MockSemanticCacheService,
  MockQueryGeneratorService,
  MockQueryValidatorService,
  MockResponseGeneratorService,
  MockFeedbackService
} from '../mocks/services';
import { ConversationRequestDto, ConversationResponseDto } from '../../src/modules/api-gateway/dtos/conversation.dto';
import { FeedbackRequestDto, FeedbackResponseDto } from '../../src/modules/api-gateway/dtos/feedback-request.dto';
import { HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ConversationRequest } from '../../src/modules/orchestrator/interfaces/conversation.interface';

describe('Fluxo de Conversação (Integração)', () => {
  let controller: ConversationController;
  let orchestratorService: OrchestratorService;
  let semanticCacheService: SemanticCacheService;
  let queryGeneratorService: QueryGeneratorService;
  let queryValidatorService: QueryValidatorService;
  let responseGeneratorService: ResponseGeneratorService;
  let feedbackService: FeedbackService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ConversationController],
      providers: [
        { provide: OrchestratorService, useClass: MockOrchestratorService },
        { provide: SemanticCacheService, useClass: MockSemanticCacheService },
        { provide: QueryGeneratorService, useClass: MockQueryGeneratorService },
        { provide: QueryValidatorService, useClass: MockQueryValidatorService },
        { provide: ResponseGeneratorService, useClass: MockResponseGeneratorService },
        { provide: FeedbackService, useClass: MockFeedbackService },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === 'bigquery.allowedTables') return ['PEDIDOS', 'PRODUTOS'];
              if (key === 'bigquery.maxBytesBilled') return 1000000;
              return null;
            }),
          },
        },
      ],
    }).compile();

    controller = module.get<ConversationController>(ConversationController);
    orchestratorService = module.get<OrchestratorService>(OrchestratorService);
    semanticCacheService = module.get<SemanticCacheService>(SemanticCacheService);
    queryGeneratorService = module.get<QueryGeneratorService>(QueryGeneratorService);
    queryValidatorService = module.get<QueryValidatorService>(QueryValidatorService);
    responseGeneratorService = module.get<ResponseGeneratorService>(ResponseGeneratorService);
    feedbackService = module.get<FeedbackService>(FeedbackService);
  });

  it('deve processar uma pergunta com cache miss e gerar resposta', async () => {
    // Arrange
    const request: ConversationRequestDto = {
      message: 'Quais são os produtos mais vendidos no último mês?',
      conversationId: 'test-conv'
    };

    jest.spyOn(semanticCacheService, 'findSimilarQuestion').mockResolvedValueOnce(null);

    // Act
    const response = await controller.sendMessage(request);

    // Assert
    expect(response).toBeDefined();
    expect(response.message).toContain('produtos mais vendidos');
    expect(response.metadata.source).toBe('query');
  });

  it('deve processar uma pergunta com cache hit', async () => {
    // Arrange
    const request: ConversationRequestDto = {
      message: 'Qual o total de vendas em janeiro?',
      conversationId: 'test-conv'
    };

    // Act
    const response = await controller.sendMessage(request);

    // Assert
    expect(response).toBeDefined();
    expect(response.metadata.source).toBe('cache');
  });

  it('deve processar feedback positivo', async () => {
    // Arrange
    const feedback: FeedbackRequestDto = {
      conversationId: 'test-conv',
      responseId: 'test-id',
      type: 'positive' as any,
      helpful: true,
      comment: 'Ótima resposta!'
    };

    jest.spyOn(feedbackService, 'processFeedback').mockResolvedValueOnce({
      success: true,
      message: 'Feedback processado com sucesso'
    });

    // Act
    const result = await controller.sendFeedback('test-conv', feedback);

    // Assert
    expect(result).toBeDefined();
    expect(result.status).toBe('processed');
  });

  it('deve lidar com erro ao processar pergunta', async () => {
    // Arrange
    const request: ConversationRequestDto = {
      message: 'Gere um erro ao processar esta pergunta',
      conversationId: 'test-conv'
    };

    const httpError = new HttpException('Erro ao processar pergunta', HttpStatus.INTERNAL_SERVER_ERROR);
    jest.spyOn(orchestratorService, 'processConversation').mockImplementationOnce(() => {
      throw httpError;
    });

    // Act & Assert
    try {
      await controller.sendMessage(request);
      fail('Deveria ter lançado uma exceção');
    } catch (error) {
      const httpException = error as HttpException;
      expect(httpException).toBeInstanceOf(HttpException);
      expect(httpException.getStatus()).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
    }
  });

  it('deve lidar com SQL inválido', async () => {
    // Arrange
    const request: ConversationRequestDto = {
      message: 'Gere um SQL inválido',
      conversationId: 'test-conv'
    };

    const httpError = new HttpException('SQL inválido', HttpStatus.BAD_REQUEST);
    jest.spyOn(orchestratorService, 'processConversation').mockImplementationOnce(() => {
      throw httpError;
    });

    // Act & Assert
    try {
      await controller.sendMessage(request);
      fail('Deveria ter lançado uma exceção');
    } catch (error) {
      const httpException = error as HttpException;
      expect(httpException).toBeInstanceOf(HttpException);
      expect(httpException.getStatus()).toBe(HttpStatus.BAD_REQUEST);
    }
  });
});
