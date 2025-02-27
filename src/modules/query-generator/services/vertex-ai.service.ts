import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { VertexAI } from '@google-cloud/vertexai';

@Injectable()
export class VertexAIService {
  private vertexAI: VertexAI;

  constructor(private configService: ConfigService) {
    this.vertexAI = new VertexAI({
      project: this.configService.get<string>('VERTEX_AI_PROJECT'),
      location: this.configService.get<string>('VERTEX_AI_LOCATION'),
    });
  }

  async generateSQL(question: string): Promise<string> {
    try {
      const model = this.vertexAI.preview.getGenerativeModel({
        model: this.configService.get<string>('VERTEX_AI_MODEL') || 'text-bison',
      });

      const prompt = `
        Você é um especialista em SQL e BigQuery.
        Por favor, gere uma consulta SQL válida para a seguinte pergunta:
        "${question}"

        Use as seguintes tabelas disponíveis:
        - PEDIDOS (id_order_tiny, data_pedido, valor_total, itensJSON)
        - PRODUTOS (ProductRefId, NameComplete, BrandName, IsActive)
        - ASSINATURA (id, customerId, status, nextPurchaseDate)
        - STATUS_ASSINANTES (customerId, status, data_atualizacao_warehouse)

        Regras:
        1. Use apenas operações SELECT (não permita INSERT, UPDATE, DELETE)
        2. Formate a consulta para melhor legibilidade
        3. Use aliases descritivos para tabelas
        4. Inclua comentários explicativos quando necessário
      `;

      const result = await model.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
      });

      const sql = result.response.candidates[0]?.content as unknown as string;
      if (!sql) {
        throw new Error('Resposta vazia da API');
      }

      return sql;
    } catch (error: any) {
      throw new Error(`Erro ao gerar consulta SQL: ${error.message || 'Erro desconhecido'}`);
    }
  }
}
