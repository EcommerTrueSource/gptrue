import { OrchestratorService, SemanticCacheService, QueryGeneratorService, QueryValidatorService, ResponseGeneratorService, FeedbackService } from '../interfaces/services';
import { ConversationRequest, ConversationResponse, FeedbackDto, ValidationResult, QueryCostEstimate, CacheTemplate } from '../interfaces/dtos';

export class MockOrchestratorService implements OrchestratorService {
  async processConversation(request: ConversationRequest): Promise<ConversationResponse> {
    // Verificar se é uma pergunta que deve gerar erro
    if (request.message.includes('erro')) {
      throw new Error('Erro ao processar pergunta');
    }

    // Verificar se é uma pergunta que deve gerar SQL inválido
    if (request.message.includes('SQL inválido')) {
      throw new Error('SQL inválido');
    }

    // Personalizar a resposta com base na pergunta
    let message = 'Resposta mockada';
    let source: 'cache' | 'query' = 'cache';

    if (request.message.toLowerCase().includes('produtos mais vendidos')) {
      message = 'Os 5 produtos mais vendidos no último mês foram: Produto A (150 unidades), Produto B (120 unidades), Produto C (90 unidades), Produto D (75 unidades), Produto E (60 unidades).';
      source = 'query';
    } else if (request.message.toLowerCase().includes('total de vendas')) {
      message = 'O total de vendas em janeiro foi de R$ 1.250.000,00.';
      source = 'cache';
    }

    return {
      id: 'test-id',
      conversationId: request.conversationId || 'new-conv-id',
      message: message,
      metadata: {
        processingTimeMs: 100,
        source: source,
        confidence: 0.95,
        tables: ['PEDIDOS']
      },
      feedbackOptions: {
        thumbsUp: true,
        thumbsDown: true,
        commentEnabled: true
      }
    };
  }

  async processFeedback(conversationId: string, feedback: FeedbackDto): Promise<any> {
    return {
      status: 'processed',
      message: 'Feedback processado com sucesso'
    };
  }
}

export class MockSemanticCacheService implements SemanticCacheService {
  async findSimilarQuestion(question: string): Promise<CacheTemplate | null> {
    return {
      id: 'test-id',
      question: 'Pergunta similar',
      response: 'Resposta do cache',
      metadata: {
        source: 'cache',
        confidence: 0.95,
        tables: ['PEDIDOS'],
        processingTimeMs: 100
      }
    };
  }

  async storeResult(question: string, result: any): Promise<boolean> {
    return true;
  }

  async updateFeedback(templateId: string, feedback: FeedbackDto): Promise<void> {
    return;
  }

  async invalidateTemplate(templateId: string): Promise<boolean> {
    return true;
  }
}

export class MockQueryGeneratorService implements QueryGeneratorService {
  async generateSQL(question: string): Promise<string> {
    return `SELECT * FROM PEDIDOS LIMIT 10;`;
  }
}

export class MockQueryValidatorService implements QueryValidatorService {
  async validateQuery(query: string): Promise<ValidationResult> {
    return {
      isValid: true,
      optimizedQuery: null
    };
  }

  async estimateQueryCost(query: string): Promise<QueryCostEstimate> {
    return {
      bytesProcessed: 1000,
      estimatedCost: 0.5,
      isExpensive: false
    };
  }
}

export class MockResponseGeneratorService implements ResponseGeneratorService {
  async generateResponse(data: any, context: {
    pergunta: string;
    query: string;
    tables: string[];
  }): Promise<ConversationResponse> {
    // Personalizar a resposta com base na pergunta
    let message = 'Resposta formatada';

    if (context.pergunta.toLowerCase().includes('produtos mais vendidos')) {
      message = 'Os 5 produtos mais vendidos no último mês foram: Produto A (150 unidades), Produto B (120 unidades), Produto C (90 unidades), Produto D (75 unidades), Produto E (60 unidades).';
    }

    return {
      id: 'test-id',
      conversationId: 'test-conv',
      message: message,
      metadata: {
        processingTimeMs: 100,
        source: 'query',
        confidence: 0.95,
        tables: context.tables
      },
      feedbackOptions: {
        thumbsUp: true,
        thumbsDown: true,
        commentEnabled: true
      }
    };
  }

  async formatResponse(data: any[], type: 'table' | 'time-series'): Promise<string> {
    return 'Dados formatados';
  }
}

export class MockFeedbackService implements FeedbackService {
  async processFeedback(feedback: FeedbackDto): Promise<boolean> {
    return true;
  }
}
