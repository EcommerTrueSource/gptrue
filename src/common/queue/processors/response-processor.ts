import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { ResponseGeneratorService } from '../../../modules/response-generator/services/response-generator.service';

interface ResponseJobData {
  question: string;
  queryResult: unknown;
  context?: {
    config?: {
      language?: string;
      format?: string;
      includeMetadata?: boolean;
    };
    startTime?: number;
  };
}

interface GeneratedResponse {
  text: string;
  suggestions: string[];
  metadata?: {
    confidence: number;
    sourceTables?: string[];
    executionTimeMs?: number;
  };
}

@Processor('response-generation')
export class ResponseProcessor {
  private readonly logger = new Logger(ResponseProcessor.name);

  constructor(private responseGeneratorService: ResponseGeneratorService) {}

  /**
   * Gera uma resposta em linguagem natural de forma assíncrona
   * @param job Job com dados para geração
   * @returns Resposta gerada
   */
  @Process('generate-response')
  async generateResponse(job: Job<ResponseJobData>) {
    try {
      this.logger.log(`Gerando resposta: ${job.id}`);
      await job.progress(10);

      const { question, queryResult, context } = job.data;

      // Preparar contexto
      this.logger.debug('Preparando contexto para geração de resposta');
      await job.progress(30);

      // Gerar resposta
      this.logger.debug('Gerando resposta em linguagem natural');
      await job.progress(50);

      const response = await this.responseGeneratorService.generateResponse({
        question,
        queryResult,
        metadata: {
          startTime: context?.startTime || Date.now(),
        },
      });

      await job.progress(100);
      this.logger.log(`Resposta gerada com sucesso: ${job.id}`);

      return {
        success: true,
        response,
        suggestions: response.suggestions,
        executionTimeMs: Date.now() - job.timestamp,
      };
    } catch (error: unknown) {
      const err = error as Error;
      this.logger.error(`Erro ao gerar resposta: ${err.message}`, err.stack);
      throw new Error(`Erro ao gerar resposta: ${err.message}`);
    }
  }
}
