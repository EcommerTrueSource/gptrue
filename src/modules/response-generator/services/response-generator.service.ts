import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OpenAIService } from '../../../integrations/openai/openai.service';
import { ProcessingResult } from '../../orchestrator/interfaces/conversation.interface';
import { ResponseContext, GeneratedResponse } from '../interfaces/response-generator.interface';

@Injectable()
export class ResponseGeneratorService {
  private readonly logger = new Logger(ResponseGeneratorService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly openAIService: OpenAIService,
  ) {}

  async generateResponse(context: ResponseContext): Promise<ProcessingResult> {
    try {
      const prompt = this.buildPrompt(context);
      const response = await this.openAIService.generateResponse(prompt);

      return {
        message: response,
        metadata: {
          processingTimeMs: Date.now() - (context.metadata?.startTime || Date.now()),
          source: 'query',
          confidence: this.calculateConfidence(response),
          tables: context.queryResult?.metadata?.schema?.map(field => field.name) || [],
          sql: context.queryResult?.metadata?.sql,
        },
      };
    } catch (error) {
      this.logger.error('Erro ao gerar resposta:', error);
      throw error;
    }
  }

  private buildPrompt(context: ResponseContext): string {
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

    return `Você é um assistente especializado em análise de dados de e-commerce para a plataforma True.
    Sua função é fornecer respostas claras, precisas e informativas com base nos dados disponíveis.
    Use linguagem natural e amigável, explicando conceitos técnicos quando necessário.
    Formate números de forma legível (ex: R$ 1.234,56 em vez de 1234.56).
    Sempre que possível, forneça insights adicionais além dos dados brutos.
    Responda em português do Brasil.

    Pergunta: ${question}

    ${formattedResult}`;
  }

  async generateResponseFromContext(context: ResponseContext): Promise<GeneratedResponse> {
    try {
      this.logger.log(`Gerando resposta para: ${context.question}`);

      const prompt = this.buildPrompt(context);
      const response = await this.openAIService.generateResponse(prompt);
      const confidence = this.calculateConfidence(response);

      return {
        message: response,
        metadata: {
          processingTimeMs: Date.now() - (context.metadata?.startTime || Date.now()),
          source: 'query',
          confidence,
          tables: context.queryResult?.metadata?.schema?.map(field => field.name) || [],
          sql: context.queryResult?.metadata?.sql,
        },
      };
    } catch (error) {
      this.logger.error('Erro ao gerar resposta:', error);
      throw error;
    }
  }

  private calculateConfidence(response: string): number {
    // Implementação simplificada - pode ser melhorada com análise mais sofisticada
    return response.length > 0 ? 0.8 : 0;
  }
}
