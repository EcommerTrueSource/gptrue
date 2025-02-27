import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { ResponseGeneratorService } from '../../src/modules/response-generator/services/response-generator.service';
import { OpenAIService } from '../../src/modules/response-generator/services/openai.service';

describe('ResponseGeneratorService', () => {
  let service: ResponseGeneratorService;
  let openAIService: OpenAIService;

  const mockConfigService = {
    get: jest.fn((key: string) => {
      switch (key) {
        case 'OPENAI_API_KEY':
          return 'test-key';
        case 'OPENAI_MODEL':
          return 'gpt-4';
        case 'MAX_TOKENS':
          return 1000;
        default:
          return undefined;
      }
    }),
  };

  const mockOpenAIService = {
    generateResponse: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ResponseGeneratorService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: OpenAIService,
          useValue: mockOpenAIService,
        },
      ],
    }).compile();

    service = module.get<ResponseGeneratorService>(ResponseGeneratorService);
    openAIService = module.get<OpenAIService>(OpenAIService);
  });

  it('deve estar definido', () => {
    expect(service).toBeDefined();
  });

  describe('generateResponse', () => {
    it('deve gerar uma resposta para resultados de produtos', async () => {
      const data = [
        { nome_produto: 'Produto A', total_vendas: 100 },
        { nome_produto: 'Produto B', total_vendas: 80 },
      ];
      const question = 'Quais são os produtos mais vendidos?';
      const query = 'SELECT nome_produto, total_vendas FROM produtos ORDER BY total_vendas DESC';
      const tables = ['PRODUTOS'];

      const mockResponse = {
        message: 'Os produtos mais vendidos são: Produto A (100 unidades) e Produto B (80 unidades)',
        suggestions: ['Qual o faturamento desses produtos?', 'Como está o estoque desses produtos?'],
      };

      mockOpenAIService.generateResponse.mockResolvedValueOnce(mockResponse);

      const resultado = await service.generateResponse({ data, question, query, tables });

      expect(resultado.message).toBe(mockResponse.message);
      expect(resultado.suggestions).toEqual(mockResponse.suggestions);
    });

    it('deve gerar uma resposta para análise de assinaturas', async () => {
      const data = [
        { mes: '2024-01', taxa_renovacao: 85.5, total_assinantes: 1000 },
        { mes: '2024-02', taxa_renovacao: 87.2, total_assinantes: 1100 },
      ];
      const question = 'Qual a taxa de renovação das assinaturas?';
      const query = 'SELECT mes, taxa_renovacao, total_assinantes FROM assinaturas';
      const tables = ['ASSINATURA'];

      const mockResponse = {
        message: 'A taxa de renovação das assinaturas aumentou de 85.5% em janeiro para 87.2% em fevereiro',
        suggestions: ['Qual o motivo do aumento?', 'Como está o churn rate?'],
      };

      mockOpenAIService.generateResponse.mockResolvedValueOnce(mockResponse);

      const resultado = await service.generateResponse({ data, question, query, tables });

      expect(resultado.message).toBe(mockResponse.message);
      expect(resultado.suggestions).toEqual(mockResponse.suggestions);
    });

    it('deve incluir sugestões de perguntas relacionadas', async () => {
      const data = [{ total_vendas: 1000 }];
      const question = 'Qual o total de vendas?';
      const query = 'SELECT SUM(total) as total_vendas FROM pedidos';
      const tables = ['PEDIDOS'];

      const mockResponse = {
        message: 'O total de vendas é de 1000 unidades',
        suggestions: [
          'Qual o ticket médio?',
          'Como as vendas se comparam com o mês anterior?',
          'Quais os produtos mais vendidos?',
        ],
      };

      mockOpenAIService.generateResponse.mockResolvedValueOnce(mockResponse);

      const resultado = await service.generateResponse({ data, question, query, tables });

      expect(resultado.suggestions).toHaveLength(3);
      expect(resultado.suggestions).toEqual(mockResponse.suggestions);
    });

    it('deve formatar valores monetários corretamente', async () => {
      const data = [{ faturamento: 1234.56 }];
      const question = 'Qual o faturamento total?';
      const query = 'SELECT SUM(valor) as faturamento FROM pedidos';
      const tables = ['PEDIDOS'];

      const mockResponse = {
        message: 'O faturamento total é de R$ 1.234,56',
        suggestions: ['Como isso se compara com o mês anterior?'],
      };

      mockOpenAIService.generateResponse.mockResolvedValueOnce(mockResponse);

      const resultado = await service.generateResponse({ data, question, query, tables });

      expect(resultado.message).toContain('R$ 1.234,56');
    });

    it('deve lidar com resultados vazios', async () => {
      const data = [];
      const question = 'Qual o total de vendas?';
      const query = 'SELECT SUM(total) as total_vendas FROM pedidos';
      const tables = ['PEDIDOS'];

      const mockResponse = {
        message: 'Não foram encontrados resultados para sua consulta',
        suggestions: ['Tente ajustar o período da consulta', 'Verifique outros indicadores'],
      };

      mockOpenAIService.generateResponse.mockResolvedValueOnce(mockResponse);

      const resultado = await service.generateResponse({ data, question, query, tables });

      expect(resultado.message).toContain('Não foram encontrados resultados');
    });

    it('deve lidar com erros na geração de resposta', async () => {
      const data = [{ total: 100 }];
      const question = 'Pergunta inválida';
      const query = 'SELECT total FROM pedidos';
      const tables = ['PEDIDOS'];

      mockOpenAIService.generateResponse.mockRejectedValueOnce(new Error('Erro ao gerar resposta'));

      await expect(
        service.generateResponse({ data, question, query, tables })
      ).rejects.toThrow('Erro ao gerar resposta');
    });
  });
});
