import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { QueryValidatorService } from '../../src/modules/query-validator/services/query-validator.service';
import { BigQueryService } from '../../src/database/bigquery/services/bigquery.service';
import { BIGQUERY_SERVICE } from '../../src/database/bigquery/interfaces/bigquery.interface';

describe('QueryValidatorService', () => {
  let service: QueryValidatorService;
  let bigQueryService: any;

  const mockConfigService = {
    get: jest.fn((key: string) => {
      switch (key) {
        case 'MAX_QUERY_COST':
          return 1000000;
        case 'MAX_EXECUTION_TIME':
          return 30;
        case 'ALLOWED_TABLES':
          return ['PEDIDOS', 'PRODUTOS', 'ASSINATURA'];
        case 'bigquery.projectId':
          return 'test-project';
        case 'bigquery.keyFilename':
          return 'test-key.json';
        default:
          return undefined;
      }
    }),
  };

  const mockBigQueryService = {
    validateQuery: jest.fn().mockResolvedValue(true),
    estimateCost: jest.fn(),
    executeQuery: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QueryValidatorService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: BIGQUERY_SERVICE,
          useValue: mockBigQueryService,
        },
      ],
    }).compile();

    service = module.get<QueryValidatorService>(QueryValidatorService);
    bigQueryService = module.get(BIGQUERY_SERVICE);

    // Reset mocks
    jest.clearAllMocks();

    // Configurar o mock para retornar um valor padrão baixo para não acionar o limite de recursos
    mockBigQueryService.estimateCost.mockResolvedValue(100000);
  });

  it('deve estar definido', () => {
    expect(service).toBeDefined();
  });

  describe('validate', () => {
    it('deve rejeitar queries vazias', async () => {
      const resultado = await service.validateQuery('');
      expect(resultado.isValid).toBe(false);
      expect(resultado.errors).toBeDefined();
      expect(resultado.errors![0].code).toBe('EMPTY_QUERY');
    });

    it('deve rejeitar queries com operações de modificação', async () => {
      const query = 'DELETE FROM PEDIDOS WHERE id = 1';
      const resultado = await service.validateQuery(query);
      expect(resultado.isValid).toBe(false);
      expect(resultado.errors).toBeDefined();
      expect(resultado.errors![0].code).toBe('INVALID_OPERATION');
      expect(resultado.errors![0].message).toBe('Operações de modificação não são permitidas');
    });

    it('deve aceitar queries SELECT válidas', async () => {
      const query = 'SELECT * FROM PEDIDOS WHERE data_pedido > "2024-01-01"';

      const resultado = await service.validateQuery(query);
      expect(resultado.isValid).toBe(true);
      expect(resultado.warnings).toHaveLength(0);
    });

    it('deve rejeitar queries com sintaxe inválida', async () => {
      // Para este teste, vamos usar uma query que não começa com SELECT
      const query = 'FROM PEDIDOS WHERE id = 1';

      const resultado = await service.validateQuery(query);
      expect(resultado.isValid).toBe(false);
      expect(resultado.errors).toBeDefined();
      expect(resultado.errors![0].code).toBe('SYNTAX_ERROR');
    });

    it('deve validar limites de recursos', async () => {
      const queryGrande = 'SELECT * FROM PEDIDOS JOIN PRODUTOS';
      // Simular um processamento muito grande
      mockBigQueryService.estimateCost.mockResolvedValueOnce(2000000000);

      const resultado = await service.validateQuery(queryGrande);
      expect(resultado.isValid).toBe(false);
      expect(resultado.errors).toBeDefined();
      expect(resultado.errors![0].code).toBe('RESOURCE_LIMIT');
    });

    it('deve validar acesso a tabelas permitidas', async () => {
      const query = 'SELECT * FROM TABELA_NAO_PERMITIDA';
      const resultado = await service.validateQuery(query);
      expect(resultado.isValid).toBe(false);
      expect(resultado.errors).toBeDefined();
      expect(resultado.errors![0].code).toBe('UNAUTHORIZED_TABLE');
    });
  });

  describe('estimateQueryCost', () => {
    it('deve estimar custo corretamente', async () => {
      const query = 'SELECT * FROM PEDIDOS';
      mockBigQueryService.estimateCost.mockResolvedValueOnce(500000);

      const estimatedCost = await service.estimateQueryCost(query);
      expect(estimatedCost).toBeDefined();
      expect(estimatedCost.processingBytes).toBe(500000);
    });

    it('deve identificar queries custosas', async () => {
      const query = 'SELECT * FROM PEDIDOS JOIN PRODUTOS';
      mockBigQueryService.estimateCost.mockResolvedValueOnce(2000000000);

      const resultado = await service.validateQuery(query);
      expect(resultado.isValid).toBe(false);
      expect(resultado.errors).toBeDefined();
      expect(resultado.errors![0].code).toBe('RESOURCE_LIMIT');
      expect(resultado.estimatedCost).toBeDefined();
      expect(resultado.estimatedCost!.processingBytes).toBe(2000000000);
    });
  });
});
