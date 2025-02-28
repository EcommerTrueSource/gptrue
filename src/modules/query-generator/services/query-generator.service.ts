import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';
import { VertexAIService } from '../../../integrations/vertex-ai/vertex-ai.service';
import { SQLGenerationError } from '../errors/sql-generation.error';
import { TableSchemas } from '../constants/table-schemas.constant';

@Injectable()
export class QueryGeneratorService implements OnModuleInit {
  private readonly logger = new Logger(QueryGeneratorService.name);
  private template: string;

  constructor(
    private readonly vertexAIService: VertexAIService,
    private readonly configService: ConfigService,
  ) {}

  onModuleInit() {
    try {
      // Usar o template do diretório raiz do projeto
      const templatePath = path.join(process.cwd(), 'templates', 'files', 'sql-generator.template.txt');
      this.template = fs.readFileSync(templatePath, 'utf8');
      this.logger.log(`Template de geração SQL carregado com sucesso: ${templatePath}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      const errorStack = error instanceof Error ? error.stack : '';
      this.logger.error(`Erro ao carregar o template de geração SQL: ${errorMessage}`, errorStack);
      throw error;
    }
  }

  async generateSQL(question: string): Promise<string> {
    if (!question) {
      throw new Error('Pergunta não pode estar vazia');
    }

    try {
      this.logger.debug('Gerando SQL para a pergunta', { question });

      // 1. Preparar o prompt com o schema das tabelas
      const prompt = this.preparePrompt(question);

      // 2. Gerar SQL usando Vertex AI
      this.logger.debug('Enviando prompt para o Vertex AI');
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

    // Obter o ID do projeto e dataset do BigQuery
    const projectId = this.configService.get<string>('bigquery.projectId') || 'truebrands-warehouse';
    const datasetId = this.configService.get<string>('bigquery.dataset') || 'truebrands_warehouse';

    this.logger.debug('Preparando prompt com template e schema de tabelas');

    // Substituir placeholders no template
    const formattedTemplate = this.template
      .replace(/{project_id}/g, projectId)
      .replace(/{dataset_id}/g, datasetId);

    return `
      ${formattedTemplate}

      Pergunta do usuário:
      ${question}

      Parâmetros adicionais:
      - Limite de tokens: ${maxTokens}
      - Temperature: ${temperature}
    `;
  }

  private validateSQLSyntax(sql: string): void {
    if (!sql || typeof sql !== 'string') {
      throw new Error('SQL gerado é inválido ou vazio');
    }

    this.logger.debug('Validando sintaxe básica do SQL gerado');

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
        this.logger.warn(`SQL contém palavra-chave proibida: ${keyword}`);
        throw new Error(`SQL contém palavra-chave proibida: ${keyword}`);
      }
    }

    // Verificar injeção de comentários maliciosos
    if (/--|\*\/|\/\*|;/g.test(sql)) {
      this.logger.warn('SQL contém caracteres potencialmente maliciosos');
      throw new Error('SQL contém caracteres potencialmente maliciosos');
    }

    this.logger.debug('Validação de sintaxe SQL concluída com sucesso');
  }
}
