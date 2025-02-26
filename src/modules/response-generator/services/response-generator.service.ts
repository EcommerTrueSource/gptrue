import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  GeneratedResponse,
  ResponseContext,
  ResponseGeneratorConfig,
  ResponseData,
  ResponseSource,
} from '../interfaces/response-generator.interface';
import { OpenAIApiService } from '../../../integrations/openai/openai-api.service';
import { OpenAIMessage } from '../../../integrations/openai/interfaces/openai.interface';

@Injectable()
export class ResponseGeneratorService {
  private readonly logger = new Logger(ResponseGeneratorService.name);
  private readonly defaultConfig: ResponseGeneratorConfig = {
    language: 'pt-BR',
    includeSQL: false,
    includeVisualization: true,
    maxSuggestions: 3,
    confidenceThreshold: 0.85,
  };

  constructor(
    private readonly configService: ConfigService,
    private readonly openAIService: OpenAIApiService,
  ) {}

  async generateResponse(context: ResponseContext): Promise<GeneratedResponse> {
    try {
      this.logger.log(`Gerando resposta para: ${context.question}`);

      const config = { ...this.defaultConfig, ...context.config };
      const startTime = Date.now();

      // Preparar o prompt para o OpenAI
      const messages = this.buildPrompt(context);

      // Gerar resposta usando OpenAI
      const response = await this.openAIService.generateText(messages as OpenAIMessage[], {
        temperature: this.configService.get<number>('ai.openai.temperature') || 0.7,
        maxTokens: this.configService.get<number>('ai.openai.maxTokens') || 2000,
        model: this.configService.get<string>('ai.openai.model') || 'gpt-4',
      });

      this.logger.debug('Resposta gerada com sucesso');

      // Gerar visualização se necessário
      let data = this.formatData(context.queryResult, config);
      if (config.includeVisualization) {
        data = await this.addVisualization(data, context);
      }

      // Gerar sugestões de perguntas relacionadas
      const suggestions = await this.generateSuggestions(context, config);

      const responseObj: GeneratedResponse = {
        message: response,
        data,
        suggestions,
        metadata: {
          processingTimeMs: Date.now() - startTime,
          source: 'query' as ResponseSource,
          confidence: 0.9, // Valor fixo já que não temos mais o objeto completion
          tables: context.queryResult?.metadata?.schema?.map(field => field.name) || [],
          sql: config.includeSQL ? context.queryResult?.metadata?.sql : undefined,
        },
      };

      return responseObj;
    } catch (error) {
      this.logger.error(`Erro ao gerar resposta: ${error instanceof Error ? error.message : 'Erro desconhecido'}`, error instanceof Error ? error.stack : undefined);

      // Tentar fallback com modelo menor
      try {
        this.logger.log('Tentando fallback com modelo menor');
        const startTime = Date.now();

        const messages = this.buildPrompt(context);

        const response = await this.openAIService.generateTextFallback(messages as OpenAIMessage[]);

        this.logger.debug('Resposta gerada com sucesso no fallback');

        // Gerar visualização se necessário
        let data = this.formatData(context.queryResult, this.defaultConfig);
        if (this.defaultConfig.includeVisualization) {
          data = await this.addVisualization(data, context);
        }

        // Gerar sugestões de perguntas relacionadas
        const suggestions = await this.generateSuggestions(context, this.defaultConfig);

        const responseObj: GeneratedResponse = {
          message: response,
          data,
          suggestions,
          metadata: {
            processingTimeMs: Date.now() - startTime,
            source: 'query' as ResponseSource,
            confidence: 0.7, // Valor fixo para fallback
            tables: context.queryResult?.metadata?.schema?.map(field => field.name) || [],
            sql: this.defaultConfig.includeSQL ? context.queryResult?.metadata?.sql : undefined,
          },
        };

        return responseObj;
      } catch (fallbackError) {
        this.logger.error(`Erro no fallback: ${fallbackError instanceof Error ? fallbackError.message : 'Erro desconhecido'}`, fallbackError instanceof Error ? fallbackError.stack : undefined);
        throw new Error(`Falha ao gerar resposta: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
      }
    }
  }

  private buildPrompt(context: ResponseContext): Array<{ role: string; content: string }> {
    const { question, queryResult } = context;

    // Formatar o resultado da consulta
    let formattedResult = '';

    if (queryResult) {
      if (queryResult.metadata?.schema && queryResult.metadata?.totalRows) {
        formattedResult = `Resultado da consulta (${queryResult.metadata.totalRows} linhas):\n`;
        formattedResult += JSON.stringify(queryResult.rows, null, 2);
      } else {
        formattedResult = JSON.stringify(queryResult, null, 2);
      }
    }

    return [
      {
        role: 'system',
        content: `Você é um assistente especializado em análise de dados de e-commerce para a plataforma True.
        Sua função é fornecer respostas claras, precisas e informativas com base nos dados disponíveis.
        Use linguagem natural e amigável, explicando conceitos técnicos quando necessário.
        Formate números de forma legível (ex: R$ 1.234,56 em vez de 1234.56).
        Sempre que possível, forneça insights adicionais além dos dados brutos.
        Responda em português do Brasil.`,
      },
      {
        role: 'user',
        content: `Pergunta: ${question}\n\n${formattedResult}`,
      },
    ];
  }

  private calculateConfidence(completion: any): number {
    // Implementação simplificada - em produção, usar métricas mais sofisticadas
    return completion.choices[0].finish_reason === 'stop' ? 0.95 : 0.7;
  }

  private formatData(queryResult: any, config: ResponseGeneratorConfig): ResponseData {
    // Implementar formatação específica baseada no tipo de dados
    return {
      type: this.determineDataType(queryResult),
      content: queryResult?.data || null,
    };
  }

  private determineDataType(queryResult: any): 'table' | 'scalar' | 'chart' {
    if (!queryResult?.data) return 'scalar';
    if (queryResult.data.length === 1 && Object.keys(queryResult.data[0]).length === 1) {
      return 'scalar';
    }
    return 'table';
  }

  private async addVisualization(
    data: ResponseData,
    context: ResponseContext,
  ): Promise<ResponseData> {
    // Implementar lógica de visualização baseada no tipo de dados
    if (data.type === 'table') {
      data.visualization = {
        type: this.suggestChartType(context),
        options: this.generateChartOptions(context),
      };
    }
    return data;
  }

  private suggestChartType(context: ResponseContext): 'bar' | 'line' | 'pie' | 'scatter' {
    // Implementar lógica para sugerir o melhor tipo de gráfico
    const data = context.queryResult?.data || [];
    if (data.length <= 5) return 'pie';
    if (this.hasTimeData(data)) return 'line';
    return 'bar';
  }

  private generateChartOptions(context: ResponseContext): any {
    // Implementar geração de opções de gráfico
    return {
      // Opções básicas de gráfico
      responsive: true,
      maintainAspectRatio: false,
    };
  }

  private hasTimeData(data: any[]): boolean {
    // Verificar se os dados contêm séries temporais
    if (!data || data.length === 0) return false;
    const firstRow = data[0];
    return Object.keys(firstRow).some(
      key =>
        key.toLowerCase().includes('data') ||
        key.toLowerCase().includes('date') ||
        key.toLowerCase().includes('time'),
    );
  }

  private async generateSuggestions(
    context: ResponseContext,
    config: ResponseGeneratorConfig,
  ): Promise<string[]> {
    try {
      if (!config.maxSuggestions) {
        return [];
      }

      const messages = this.buildSuggestionsPrompt(context);

      const response = await this.openAIService.generateText(messages as OpenAIMessage[], {
        temperature: 0.7,
        maxTokens: 200,
        model: this.configService.get<string>('ai.openai.model') || 'gpt-4',
      });

      // Espera-se que a resposta seja uma lista de sugestões separadas por quebras de linha
      const suggestions = response
        .split('\n')
        .map(s => s.trim())
        .filter(s => s.length > 0)
        .slice(0, config.maxSuggestions);

      return suggestions;
    } catch (error) {
      this.logger.error(`Erro ao gerar sugestões: ${error instanceof Error ? error.message : 'Erro desconhecido'}`, error instanceof Error ? error.stack : undefined);
      return [];
    }
  }

  private buildSuggestionsPrompt(
    context: ResponseContext,
  ): Array<{ role: string; content: string }> {
    const { question, queryResult } = context;

    return [
      {
        role: 'system',
        content: `Você é um assistente especializado em análise de dados de e-commerce.
        Com base na pergunta do usuário e nos resultados da consulta, sugira 3 perguntas relacionadas
        que o usuário poderia fazer para aprofundar sua análise. As perguntas devem ser relevantes,
        específicas e baseadas nos dados disponíveis. Formate as sugestões como uma lista numerada.`,
      },
      {
        role: 'user',
        content: `Pergunta original: "${question}"

        Resultado da consulta:
        ${JSON.stringify(queryResult, null, 2)}

        Gere 3 sugestões de perguntas relacionadas que eu poderia fazer para aprofundar minha análise.`,
      },
    ];
  }
}
