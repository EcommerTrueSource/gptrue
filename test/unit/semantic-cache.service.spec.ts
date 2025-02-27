import { jest } from '@jest/globals';
import { Test, TestingModule } from '@nestjs/testing';
import { SemanticCacheService } from '../../src/modules/semantic-cache/services/semantic-cache.service';
import { ConfigService } from '@nestjs/config';
import { FeedbackDto } from '../interfaces/dtos';
import { OpenAIEmbeddings } from '@langchain/openai';
import { Pinecone, Index, QueryResponse, RecordMetadata, PineconeRecord, IndexStatsDescription } from '@pinecone-database/pinecone';
import { PineconeMetadata } from '../../src/modules/semantic-cache/interfaces/pinecone.interface';
import { AsyncCaller } from '@langchain/core/utils/async_caller';

jest.mock('@langchain/openai');
jest.mock('@pinecone-database/pinecone');

interface MockedOpenAIEmbeddings {
  embedQuery: jest.Mock;
  embedDocuments: jest.Mock;
  caller: {
    call: jest.Mock;
    callWithOptions: jest.Mock;
    fetch: jest.Mock;
  };
  batchSize: number;
  stripNewLines: boolean;
  modelName: string;
}

interface MockedPineconeIndex {
  query: jest.Mock;
  upsert: jest.Mock;
  update: jest.Mock;
  describeIndexStats: jest.Mock;
}

interface MockedPinecone {
  Index: jest.Mock;
  init: jest.Mock;
}

describe('SemanticCacheService', () => {
  let service: SemanticCacheService;
  let configService: ConfigService;
  let openAIEmbeddings: MockedOpenAIEmbeddings;
  let pineconeClient: MockedPinecone;
  let pineconeIndex: MockedPineconeIndex;

  const mockConfigService = {
    get: jest.fn((key: string) => {
      switch (key) {
        case 'ai.openai.apiKey':
          return 'test-openai-key';
        case 'ai.openai.embeddingModel':
          return 'text-embedding-ada-002';
        case 'pinecone.apiKey':
          return 'test-pinecone-key';
        case 'pinecone.environment':
          return 'test-env';
        case 'pinecone.indexName':
          return 'test-index';
        case 'pinecone.similarityThreshold':
          return 0.85;
        case 'pinecone.ttl.enabled':
          return true;
        case 'pinecone.ttl.days':
          return 30;
        case 'pinecone.namespace':
          return 'test-namespace';
        default:
          return undefined;
      }
    }),
  };

  const mockEmbedding = new Array(1536).fill(0.1);

  beforeEach(async () => {
    jest.clearAllMocks();

    // Mock AsyncCaller
    const mockCaller = {
      call: jest.fn(),
      callWithOptions: jest.fn(),
      fetch: jest.fn(),
    };

    // Mock OpenAIEmbeddings
    const mockOpenAI: MockedOpenAIEmbeddings = {
      embedQuery: jest.fn().mockResolvedValue(mockEmbedding as never),
      embedDocuments: jest.fn().mockResolvedValue([mockEmbedding] as never),
      caller: mockCaller,
      batchSize: 512,
      stripNewLines: true,
      modelName: 'text-embedding-ada-002',
    };

    // Mock Pinecone Index
    pineconeIndex = {
      query: jest.fn().mockResolvedValue({
        matches: [],
        namespace: 'test-namespace',
      } as never),
      upsert: jest.fn().mockResolvedValue({ upsertedCount: 1 } as never),
      update: jest.fn().mockResolvedValue(undefined as never),
      describeIndexStats: jest.fn().mockResolvedValue({
        dimension: 1536,
        indexFullness: 0,
        totalVectorCount: 0,
      } as never),
    };

    // Mock Pinecone Client
    pineconeClient = {
      Index: jest.fn().mockReturnValue(pineconeIndex),
      init: jest.fn().mockResolvedValue(undefined as never),
    };

    // Setup mocks
    (OpenAIEmbeddings as jest.Mock).mockImplementation(() => mockOpenAI);
    (Pinecone as jest.Mock).mockImplementation(() => pineconeClient);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SemanticCacheService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: OpenAIEmbeddings,
          useValue: mockOpenAI,
        },
        {
          provide: Pinecone,
          useValue: pineconeClient,
        },
      ],
    }).compile();

    service = module.get<SemanticCacheService>(SemanticCacheService);
    configService = module.get<ConfigService>(ConfigService);
    openAIEmbeddings = module.get(OpenAIEmbeddings);
  });

  it('deve estar definido', () => {
    expect(service).toBeDefined();
  });

  describe('findSimilar', () => {
    it('deve encontrar uma pergunta similar no cache', async () => {
      const pergunta = 'Qual o produto mais vendido?';
      const mockMetadata: PineconeMetadata = {
        question: 'Qual foi o produto mais vendido no último mês?',
        response: 'O produto mais vendido foi X',
        query: 'SELECT * FROM produtos',
        executionTimeMs: 100,
        sourceTables: ['produtos', 'vendas'],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        version: '1.0',
        feedbackPositive: 0,
        feedbackNegative: 0,
        feedbackComments: [],
        needsReview: false,
      };

      const mockResultado: QueryResponse<RecordMetadata> = {
        matches: [
          {
            id: 'template-1',
            score: 0.95,
            values: mockEmbedding,
            metadata: mockMetadata,
          },
        ],
        namespace: 'test-namespace',
      };

      pineconeIndex.query.mockResolvedValueOnce(mockResultado as never);

      const resultado = await service.findSimilarQuestion(pergunta);
      expect(resultado).toBeDefined();
      expect(resultado?.metadata.source).toBe('cache');
    });

    it('deve retornar null quando não encontrar similaridade suficiente', async () => {
      const pergunta = 'Qual o produto mais vendido?';
      const mockMetadata: PineconeMetadata = {
        question: 'Qual foi o produto mais vendido no último mês?',
        response: 'O produto mais vendido foi X',
        query: 'SELECT * FROM produtos',
        executionTimeMs: 100,
        sourceTables: ['produtos', 'vendas'],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        version: '1.0',
        feedbackPositive: 0,
        feedbackNegative: 0,
        feedbackComments: [],
        needsReview: false,
      };

      const mockResultado: QueryResponse<RecordMetadata> = {
        matches: [
          {
            id: 'template-1',
            score: 0.7, // Score abaixo do limiar
            values: mockEmbedding,
            metadata: mockMetadata,
          },
        ],
        namespace: 'test-namespace',
      };

      pineconeIndex.query.mockResolvedValueOnce(mockResultado as never);

      const resultado = await service.findSimilarQuestion(pergunta);
      expect(resultado).toBeNull();
    });
  });

  describe('storeResult', () => {
    it('deve armazenar um novo template com sucesso', async () => {
      const pergunta = 'Qual o produto mais vendido?';
      const resultado = {
        message: 'O produto mais vendido foi X',
        metadata: {
          source: 'query' as const,
          confidence: 0.95,
          tables: ['produtos', 'vendas'],
          processingTimeMs: 100,
          sql: 'SELECT * FROM produtos',
        },
      };

      await expect(service.storeResult(pergunta, resultado))
        .resolves.not.toThrow();
    });

    it('deve lidar com erros ao armazenar template', async () => {
      const pergunta = 'Qual o produto mais vendido?';
      const resultado = {
        message: 'O produto mais vendido foi X',
        metadata: {
          source: 'query' as const,
          confidence: 0.95,
          tables: ['produtos', 'vendas'],
          processingTimeMs: 100,
          sql: 'SELECT * FROM produtos',
        },
      };

      pineconeIndex.upsert.mockRejectedValueOnce(new Error('Erro ao armazenar') as never);

      await expect(service.storeResult(pergunta, resultado))
        .rejects.toThrow();
    });
  });

  describe('updateFeedback', () => {
    it('deve atualizar feedback com sucesso', async () => {
      const pergunta = 'Qual o produto mais vendido?';
      const feedback: FeedbackDto = {
        question: pergunta,
        conversationId: 'conv-123',
        responseId: 'resp-123',
        type: 'positive',
        comment: 'Ótima resposta!',
      };

      const mockMetadata: PineconeMetadata = {
        question: pergunta,
        response: 'O produto mais vendido foi X',
        query: 'SELECT * FROM produtos',
        executionTimeMs: 100,
        sourceTables: ['produtos', 'vendas'],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        version: '1.0',
        feedbackPositive: 0,
        feedbackNegative: 0,
        feedbackComments: [],
        needsReview: false,
      };

      const mockResultado: QueryResponse<RecordMetadata> = {
        matches: [
          {
            id: 'template-1',
            score: 0.95,
            values: mockEmbedding,
            metadata: mockMetadata,
          },
        ],
        namespace: 'test-namespace',
      };

      pineconeIndex.query.mockResolvedValueOnce(mockResultado as never);

      await expect(service.updateFeedback(pergunta, feedback))
        .resolves.not.toThrow();
    });

    it('deve lidar com erros ao atualizar feedback', async () => {
      const pergunta = 'Qual o produto mais vendido?';
      const feedback: FeedbackDto = {
        question: pergunta,
        conversationId: 'conv-123',
        responseId: 'resp-123',
        type: 'positive',
        comment: 'Ótima resposta!',
      };

      pineconeIndex.query.mockRejectedValueOnce(new Error('Erro ao buscar template') as never);

      await expect(service.updateFeedback(pergunta, feedback))
        .rejects.toThrow();
    });
  });
});
