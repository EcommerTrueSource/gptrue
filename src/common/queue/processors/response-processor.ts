import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { ResponseGeneratorService } from '../../../modules/response-generator/services/response-generator.service';

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
  async generateResponse(job: Job<{ 
    question: string; 
    queryResult: any; 
    context?: any;
  }>) {
    try {
      this.logger.log(`Gerando resposta: ${job.id}`);
      job.updateProgress(10);

      const { question, queryResult, context } = job.data;
      
      // Preparar contexto
      this.logger.debug('Preparando contexto para geração de resposta');
      job.updateProgress(30);

      // Gerar resposta
      this.logger.debug('Gerando resposta em linguagem natural');
      job.updateProgress(50);
      
      const response = await this.responseGeneratorService.generateResponse({
        question,
        queryResult,
        config: context?.config || {},
      });
      
      job.updateProgress(100);
      this.logger.log(`Resposta gerada com sucesso: ${job.id}`);
      
      return {
        success: true,
        response,
        suggestions: response.suggestions,
        executionTimeMs: Date.now() - job.timestamp,
      };
    } catch (error) {
      this.logger.error(`Erro ao gerar resposta: ${error.message}`, error.stack);
      throw new Error(`Erro ao gerar resposta: ${error.message}`);
    }
  }
} 