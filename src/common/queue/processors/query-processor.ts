import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { BigQueryService } from '../../../database/bigquery/bigquery.service';

interface QueryJobData {
  query: string;
  options?: {
    timeoutMs?: number;
    maxBytes?: number;
    useLegacySql?: boolean;
    location?: string;
  };
}

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
  async processQuery(job: Job<QueryJobData>) {
    try {
      this.logger.log(`Processando consulta: ${job.id}`);
      await job.progress(10);

      const { query, options } = job.data;

      // Validar a consulta
      this.logger.debug(`Validando consulta: ${query}`);
      await job.progress(20);

      // Executar a consulta
      this.logger.debug('Executando consulta no BigQuery');
      await job.progress(50);

      const result = await this.bigQueryService.executeQuery(query);
      await job.progress(90);

      this.logger.log(`Consulta processada com sucesso: ${job.id}`);
      await job.progress(100);

      return {
        success: true,
        result,
        executionTimeMs: Date.now() - job.timestamp,
      };
    } catch (error: unknown) {
      const err = error as Error;
      this.logger.error(`Erro ao processar consulta: ${err.message}`, err.stack);
      throw new Error(`Erro ao processar consulta: ${err.message}`);
    }
  }
}
