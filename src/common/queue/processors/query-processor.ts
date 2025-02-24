import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { BigQueryService } from '../../../database/bigquery/bigquery.service';

@Processor('query-processing')
export class QueryProcessor {
  private readonly logger = new Logger(QueryProcessor.name);

  constructor(private bigQueryService: BigQueryService) {}

  /**
   * Processa uma consulta SQL de forma assíncrona
   * @param job Job com dados da consulta
   * @returns Resultado da consulta
   */
  @Process('process-query')
  async processQuery(job: Job<{ query: string; options?: any }>) {
    try {
      this.logger.log(`Processando consulta: ${job.id}`);
      job.updateProgress(10);

      const { query, options } = job.data;
      
      // Validar a consulta
      this.logger.debug(`Validando consulta: ${query}`);
      job.updateProgress(20);

      // Executar a consulta
      this.logger.debug('Executando consulta no BigQuery');
      job.updateProgress(50);
      const result = await this.bigQueryService.executeQuery(query, options);
      job.updateProgress(90);

      this.logger.log(`Consulta processada com sucesso: ${job.id}`);
      job.updateProgress(100);
      
      return {
        success: true,
        result,
        executionTimeMs: Date.now() - job.timestamp,
      };
    } catch (error) {
      this.logger.error(`Erro ao processar consulta: ${error.message}`, error.stack);
      throw new Error(`Erro ao processar consulta: ${error.message}`);
    }
  }
} 