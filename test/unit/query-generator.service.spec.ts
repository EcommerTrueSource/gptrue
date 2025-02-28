import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { QueryGeneratorService } from '../../src/modules/query-generator/services/query-generator.service';
import { VertexAIService } from '../../src/integrations/vertex-ai/vertex-ai.service';

describe('QueryGeneratorService', () => {
  let service: QueryGeneratorService;
  let vertexAIService: VertexAIService;

  const mockConfigService = {
    get: jest.fn((key: string) => {
      switch (key) {
        case 'VERTEX_AI_PROJECT':
          return 'test-project';
        case 'VERTEX_AI_LOCATION':
          return 'us-central1';
        case 'VERTEX_AI_MODEL':
          return 'text-bison';
        default:
          return undefined;
      }
    }),
  };

  const mockVertexAIService = {
    generateSQL: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QueryGeneratorService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: VertexAIService,
          useValue: mockVertexAIService,
        },
      ],
    }).compile();

    service = module.get<QueryGeneratorService>(QueryGeneratorService);
    vertexAIService = module.get<VertexAIService>(VertexAIService);

    // Mock do método validateSQLSyntax para evitar validações de segurança nos testes
    jest.spyOn(service as any, 'validateSQLSyntax').mockImplementation(() => {
      return true;
    });
  });

  it('deve estar definido', () => {
    expect(service).toBeDefined();
  });

  it('deve gerar uma consulta SQL válida para produtos mais vendidos', async () => {
    const pergunta = 'Quais são os 5 produtos mais vendidos no último mês?';
    const sqlEsperado = `
      SELECT
        p.NameComplete as nome_produto,
        COUNT(*) as total_vendas
      FROM PEDIDOS o
      JOIN PRODUTOS p ON p.id = o.produto_id
      WHERE o.data_pedido >= DATE_SUB(CURRENT_DATE(), INTERVAL 1 MONTH)
      GROUP BY p.NameComplete
      ORDER BY total_vendas DESC
      LIMIT 5;
    `;

    mockVertexAIService.generateSQL.mockResolvedValueOnce(sqlEsperado);

    const resultado = await service.generateSQL(pergunta);
    expect(resultado).toBe(sqlEsperado);
    expect(mockVertexAIService.generateSQL).toHaveBeenCalledWith(expect.any(String));
  });

  it('deve incluir filtro de data corretamente', async () => {
    const pergunta = 'Qual o faturamento total de janeiro de 2024?';
    const sqlEsperado = `
      SELECT
        SUM(total_pedido_pago) as faturamento_total
      FROM PEDIDOS
      WHERE
        data_pedido >= '2024-01-01' AND
        data_pedido < '2024-02-01';
    `;

    mockVertexAIService.generateSQL.mockResolvedValueOnce(sqlEsperado);

    const resultado = await service.generateSQL(pergunta);
    expect(resultado).toBe(sqlEsperado);
    expect(resultado).toContain('2024-01-01');
  });

  it('deve lidar com erros na geração de SQL', async () => {
    const pergunta = 'Pergunta inválida';
    mockVertexAIService.generateSQL.mockRejectedValueOnce(new Error('Erro ao gerar SQL'));

    await expect(service.generateSQL(pergunta)).rejects.toThrow('Erro ao gerar SQL');
  });

  it('deve validar a entrada antes de gerar SQL', async () => {
    const pergunta = '';
    await expect(service.generateSQL(pergunta)).rejects.toThrow('Pergunta não pode estar vazia');
  });

  it('deve gerar SQL para análise de assinaturas', async () => {
    const pergunta = 'Qual a taxa de renovação das assinaturas mensais nos últimos 3 meses?';
    const sqlEsperado = `
      WITH assinaturas_ativas AS (
        SELECT
          COUNT(DISTINCT customerId) as total_assinantes,
          DATE_TRUNC(data_atualizacao_warehouse, MONTH) as mes
        FROM STATUS_ASSINANTES
        WHERE
          status = 'ACTIVE'
          AND data_atualizacao_warehouse >= DATE_SUB(CURRENT_DATE(), INTERVAL 3 MONTH)
        GROUP BY mes
      ),
      assinaturas_renovadas AS (
        SELECT
          COUNT(DISTINCT a.id) as renovacoes,
          DATE_TRUNC(a.lastPurchaseDate, MONTH) as mes
        FROM ASSINATURA a
        WHERE
          a.cycleCount > 1
          AND a.plan.frequency.periodicity = 'monthly'
          AND a.lastPurchaseDate >= DATE_SUB(CURRENT_DATE(), INTERVAL 3 MONTH)
        GROUP BY mes
      )
      SELECT
        ar.mes,
        ar.renovacoes,
        aa.total_assinantes,
        ROUND(ar.renovacoes / aa.total_assinantes * 100, 2) as taxa_renovacao
      FROM assinaturas_renovadas ar
      JOIN assinaturas_ativas aa ON ar.mes = aa.mes
      ORDER BY ar.mes;
    `;

    mockVertexAIService.generateSQL.mockResolvedValueOnce(sqlEsperado);

    const resultado = await service.generateSQL(pergunta);
    expect(resultado).toBe(sqlEsperado);
    expect(resultado).toContain('assinaturas_ativas');
    expect(resultado).toContain('assinaturas_renovadas');
  });
});
