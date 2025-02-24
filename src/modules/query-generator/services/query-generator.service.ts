import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { VertexAIService } from '../../../integrations/vertex-ai/vertex-ai.service';
import { SQLGenerationError } from '../errors/sql-generation.error';
import { TableSchemas } from '../constants/table-schemas.constant';

@Injectable()
export class QueryGeneratorService {
  private readonly logger = new Logger(QueryGeneratorService.name);

  constructor(
    private readonly vertexAiService: VertexAIService,
    private readonly configService: ConfigService,
  ) {}

  async generateSQL(question: string): Promise<string> {
    try {
      this.logger.debug(`Gerando SQL para a pergunta: ${question}`);

      // 1. Preparar o prompt com o schema das tabelas
      const prompt = this.preparePrompt(question);

      // 2. Gerar SQL usando Vertex AI
      const sql = await this.vertexAiService.generateSQL(prompt);

      // 3. Validar SQL básico (sintaxe)
      this.validateSQLSyntax(sql);

      this.logger.debug(`SQL gerado com sucesso: ${sql}`);

      return sql;
    } catch (error) {
      this.logger.error('Erro ao gerar SQL:', error);
      throw new SQLGenerationError(
        `Falha ao gerar SQL: ${error.message}`,
        error
      );
    }
  }

  private preparePrompt(question: string): string {
    return `
      Dado o seguinte schema de tabelas:
      ${JSON.stringify(TableSchemas, null, 2)}
      
      Por favor, gere uma consulta SQL para responder a seguinte pergunta:
      ${question}
      
      Requisitos:
      1. Use apenas as tabelas e campos definidos no schema
      2. Otimize a query para performance
      3. Evite SELECT *
      4. Use aliases apropriados para tabelas
      5. Inclua comentários explicativos quando necessário
    `;
  }

  private validateSQLSyntax(sql: string): void {
    // Validação básica de sintaxe SQL
    const containsSelect = /SELECT/i.test(sql);
    const containsFrom = /FROM/i.test(sql);
    
    if (!containsSelect || !containsFrom) {
      throw new Error('SQL gerado não contém estrutura básica válida (SELECT ... FROM)');
    }

    // Verificar palavras-chave proibidas
    const forbiddenKeywords = ['INSERT', 'UPDATE', 'DELETE', 'DROP', 'TRUNCATE', 'ALTER'];
    for (const keyword of forbiddenKeywords) {
      if (new RegExp(keyword, 'i').test(sql)) {
        throw new Error(`SQL contém palavra-chave proibida: ${keyword}`);
      }
    }
  }
} 