import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OpenAIService } from './openai.service';
import { ResponseContext, GeneratedResponse } from '../interfaces/response-context.interface';

@Injectable()
export class ResponseGeneratorService {
  private readonly logger = new Logger(ResponseGeneratorService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly openAIService: OpenAIService,
  ) {}

  async generateResponse(context: ResponseContext): Promise<GeneratedResponse> {
    try {
      const startTime = context.metadata?.startTime || new Date();
      const prompt = this.buildPrompt(context);

      // Obter resposta do OpenAI
      const openAIResponse = await this.openAIService.generateResponse(prompt);

      // Calcular tempo de processamento
      const endTime = new Date();
      const processingTimeMs = endTime.getTime() - (
        typeof startTime === 'number' ? startTime : startTime.getTime()
      );

      // Extrair tabelas e SQL do contexto
      const tables = context.tables || [];
      const sql = context.query || context.queryResult?.metadata?.sql || '';

      return {
        message: openAIResponse.message,
        suggestions: openAIResponse.suggestions || [],
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

  private buildPrompt(context: ResponseContext): string {
    const { question, queryResult, data, query, tables } = context;

    // Extrair dados do queryResult se disponível
    const resultData = queryResult?.rows || data || [];
    const resultQuery = query || queryResult?.metadata?.sql || '';
    const resultTables = tables || [];

    return `
      Você é um assistente especializado em análise de dados de e-commerce.
      Por favor, analise os seguintes dados e forneça uma resposta clara e objetiva:

      Pergunta: ${question}
      Dados: ${JSON.stringify(resultData, null, 2)}
      Query executada: ${resultQuery}
      Tabelas utilizadas: ${resultTables.join(', ')}

      Inclua em sua resposta:
      1. Análise dos dados apresentados
      2. Insights relevantes
      3. Sugestões de perguntas relacionadas
    `;
  }
}
