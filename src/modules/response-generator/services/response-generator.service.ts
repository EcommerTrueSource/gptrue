import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';
import { OpenAIService } from '../../../integrations/openai/openai.service';
import { ResponseContext, GeneratedResponse } from '../interfaces/response-context.interface';

@Injectable()
export class ResponseGeneratorService implements OnModuleInit {
  private readonly logger = new Logger(ResponseGeneratorService.name);
  private template: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly openAIService: OpenAIService,
  ) {}

  onModuleInit() {
    try {
      // Usar o template do diretório raiz do projeto
      const templatePath = path.join(process.cwd(), 'templates', 'files', 'response-generator.template.txt');
      this.template = fs.readFileSync(templatePath, 'utf8');
      this.logger.log(`Template de geração de respostas carregado com sucesso: ${templatePath}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      const errorStack = error instanceof Error ? error.stack : '';
      this.logger.error(`Erro ao carregar o template de geração de respostas: ${errorMessage}`, errorStack);
      throw error;
    }
  }

  async generateResponse(context: ResponseContext): Promise<GeneratedResponse> {
    try {
      this.logger.debug(`Gerando resposta para pergunta: "${context.question}"`);
      const startTime = context.metadata?.startTime || new Date();
      const prompt = this.buildPrompt(context);

      // Obter resposta do OpenAI (agora retorna uma string)
      this.logger.debug('Enviando prompt para o OpenAI');
      const responseText = await this.openAIService.generateResponse(prompt);

      // Calcular tempo de processamento
      const endTime = new Date();
      const processingTimeMs = endTime.getTime() - (
        typeof startTime === 'number' ? startTime : startTime.getTime()
      );
      this.logger.debug(`Resposta gerada em ${processingTimeMs}ms`);

      // Extrair tabelas e SQL do contexto
      const tables = context.tables || [];
      const sql = context.query || context.queryResult?.metadata?.sql || '';

      // Gerar sugestões de perguntas relacionadas
      const suggestions = this.generateSuggestions(context.question, responseText);

      return {
        message: responseText,
        suggestions: suggestions,
        metadata: {
          processingTimeMs,
          source: 'query',
          confidence: 0.9, // Valor padrão, pode ser ajustado com base em lógica específica
          tables,
          sql,
        }
      };
    } catch (error) {
      this.logger.error('Erro ao gerar resposta:', error);
      throw new Error('Erro ao gerar resposta');
    }
  }

  private generateSuggestions(question: string, response: string): string[] {
    this.logger.debug('Gerando sugestões de perguntas relacionadas');
    // Implementação simples para gerar sugestões de perguntas relacionadas
    // Em uma implementação real, isso poderia usar NLP ou regras mais sofisticadas
    const defaultSuggestions = [
      'Como isso se compara com o período anterior?',
      'Quais são as tendências para os próximos meses?',
      'Qual o impacto disso nas vendas totais?'
    ];

    return defaultSuggestions;
  }

  private buildPrompt(context: ResponseContext): string {
    const { question, queryResult, data, query, tables } = context;

    // Extrair dados do queryResult se disponível
    const resultData = queryResult?.rows || data || [];
    const resultQuery = query || queryResult?.metadata?.sql || '';
    const resultTables = tables || [];

    this.logger.debug(`Construindo prompt com ${resultData.length} linhas de dados e ${resultTables.length} tabelas`);

    // Usar o template definido
    const prompt = `
      ${this.template}

      Pergunta: ${question}
      Dados: ${JSON.stringify(resultData, null, 2)}
      Query executada: ${resultQuery}
      Tabelas utilizadas: ${resultTables.join(', ')}
    `;

    return prompt;
  }
}
