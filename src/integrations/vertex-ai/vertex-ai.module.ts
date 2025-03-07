import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { VertexAIService } from './vertex-ai.service';

@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: VertexAIService,
      useFactory: (configService: ConfigService) => {
        const useMock = configService.get<string>('VERTEX_AI_USE_MOCK') === 'true';

        if (useMock) {
          console.log('Aviso: Usando mock do Vertex AI para desenvolvimento.');
          return {
            generateSQL: async (prompt: string) => {
              // Retornar SQL de exemplo baseado na pergunta
              if (prompt.toLowerCase().includes('produtos mais vendidos')) {
                return `
                SELECT
                  p.NameComplete as nome_produto,
                  SUM(i.quantidade) as total_vendido
                FROM PEDIDOS as o
                JOIN JSON_TABLE(o.itensJSON, '$[*]' COLUMNS(
                  codigo STRING PATH '$.codigo',
                  quantidade INT PATH '$.quantidade'
                )) as i
                JOIN PRODUTOS as p ON i.codigo = p.ProductRefId
                WHERE o.data_pedido >= DATE_SUB(CURRENT_DATE(), INTERVAL 1 MONTH)
                GROUP BY p.NameComplete
                ORDER BY total_vendido DESC
                LIMIT 5;
                `;
              } else if (prompt.toLowerCase().includes('ticket médio')) {
                return `
                SELECT
                  AVG(total_pedido_pago) as ticket_medio
                FROM PEDIDOS
                WHERE data_pedido >= DATE_SUB(CURRENT_DATE(), INTERVAL 3 MONTH);
                `;
              } else if (prompt.toLowerCase().includes('assinatura') || prompt.toLowerCase().includes('assinantes')) {
                return `
                SELECT
                  status,
                  COUNT(*) as total
                FROM ASSINATURA
                GROUP BY status;
                `;
              }

              // SQL genérico para outras perguntas
              return `SELECT * FROM PRODUTOS LIMIT 5;`;
            },
          };
        }

        return new VertexAIService(configService);
      },
      inject: [ConfigService],
    },
  ],
  exports: [VertexAIService],
})
export class VertexAIModule {}
