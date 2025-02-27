import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { VertexAIService } from './vertex-ai.service';
import { SQLGenerationError } from '../errors/sql-generation.error';
import { TableSchemas } from '../constants/table-schemas.constant';

@Injectable()
export class QueryGeneratorService {
  private readonly logger = new Logger(QueryGeneratorService.name);

  constructor(
    private readonly vertexAIService: VertexAIService,
    private readonly configService: ConfigService,
  ) {}

  async generateSQL(question: string): Promise<string> {
    if (!question) {
      throw new Error('Pergunta não pode estar vazia');
    }

    try {
      this.logger.debug('Gerando SQL para a pergunta', { question });

      // 1. Preparar o prompt com o schema das tabelas
      const prompt = this.preparePrompt(question);

      // 2. Gerar SQL usando Vertex AI
      const sql = await this.vertexAIService.generateSQL(prompt);

      // 3. Validar SQL básico (sintaxe)
      this.validateSQLSyntax(sql);

      this.logger.debug('SQL gerado com sucesso', { sql });

      return sql;
    } catch (error: unknown) {
      // Tratar diferentes tipos de erro
      let errorMessage: string;
      let originalError: Error;

      if (error instanceof Error) {
        errorMessage = error.message;
        originalError = error;
      } else if (typeof error === 'string') {
        errorMessage = error;
        originalError = new Error(error);
      } else {
        errorMessage = 'Erro desconhecido ao gerar SQL';
        originalError = new Error(JSON.stringify(error));
      }

      this.logger.error('Erro ao gerar SQL', {
        error: errorMessage,
        question,
      });

      throw new SQLGenerationError(errorMessage, originalError);
    }
  }

  private preparePrompt(question: string): string {
    // Configurar opções do prompt
    const maxTokens = this.configService.get<number>('vertexai.maxTokens') ?? 1000;
    const temperature = this.configService.get<number>('vertexai.temperature') ?? 0.3;

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
      6. Limite a resposta a ${maxTokens} tokens
      7. Use temperature ${temperature} para balancear criatividade e precisão
    `;
  }

  private validateSQLSyntax(sql: string): void {
    if (!sql || typeof sql !== 'string') {
      throw new Error('SQL gerado é inválido ou vazio');
    }

    // Validação básica de sintaxe SQL
    const containsSelect = /SELECT/i.test(sql);
    const containsFrom = /FROM/i.test(sql);

    if (!containsSelect || !containsFrom) {
      throw new Error('SQL gerado não contém estrutura básica válida (SELECT ... FROM)');
    }

    // Verificar palavras-chave proibidas
    const forbiddenKeywords = ['INSERT', 'UPDATE', 'DELETE', 'DROP', 'TRUNCATE', 'ALTER'];
    for (const keyword of forbiddenKeywords) {
      if (new RegExp(`\\b${keyword}\\b`, 'i').test(sql)) {
        throw new Error(`SQL contém palavra-chave proibida: ${keyword}`);
      }
    }

    // Verificar injeção de comentários maliciosos
    if (/--|\*\/|\/\*|;/g.test(sql)) {
      throw new Error('SQL contém caracteres potencialmente maliciosos');
    }
  }
}
