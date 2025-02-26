import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BigQuery, Query } from '@google-cloud/bigquery';
import { BigQueryExecutionError } from './errors/bigquery-execution.error';
import { QueryOptions, QueryResult } from './interfaces/bigquery.interface';
import { DryRunResult } from '../../modules/query-validator/interfaces/query-validator.interface';

@Injectable()
export class BigQueryService {
  private readonly logger = new Logger(BigQueryService.name);
  private readonly bigquery: BigQuery | null;
  private readonly enabled: boolean;

  constructor(private readonly configService: ConfigService) {
    this.enabled = this.configService.get<boolean>('bigquery.enabled') ?? false;

    if (this.enabled) {
      try {
        this.bigquery = new BigQuery({
          projectId: this.configService.get<string>('bigquery.projectId'),
          keyFilename: this.configService.get<string>('bigquery.keyFilename'),
        });
        this.logger.log('BigQuery service inicializado com sucesso');
      } catch (error: unknown) {
        const err = error as Error;
        this.logger.error(`Falha ao inicializar BigQuery: ${err.message}`, err.stack);
        this.bigquery = null;
        this.enabled = false;
      }
    } else {
      this.logger.warn('BigQuery está desabilitado pela configuração');
      this.bigquery = null;
    }
  }

  /**
   * Verifica se o serviço do BigQuery está disponível
   * @private
   */
  private validateBigQueryAvailability(): void {
    if (!this.enabled || !this.bigquery) {
      throw new BigQueryExecutionError(
        'BigQuery service não está disponível. Verifique as configurações.',
        'VALIDATION_ERROR',
        new Error('BigQuery service disabled')
      );
    }
  }

  /**
   * Executa uma consulta SQL
   * @param query Consulta SQL
   * @returns Resultado da consulta
   */
  public async executeQuery<T>(query: string): Promise<T[]> {
    try {
      this.validateBigQueryAvailability();

      const [rows] = await this.bigquery.query({
        query,
        location: this.configService.get<string>('bigquery.location'),
      });
      return rows as T[];
    } catch (error: unknown) {
      if (error instanceof BigQueryExecutionError) {
        throw error;
      }

      const err = error as Error;
      this.logger.error(`Erro ao executar consulta: ${err.message}`, err.stack);
      throw new BigQueryExecutionError(
        `Erro ao executar consulta: ${err.message}`,
        query,
        err
      );
    }
  }

  /**
   * Executa uma consulta SQL em modo dry run
   * @param query Consulta SQL
   * @returns Resultado do dry run
   */
  public async dryRun(query: string): Promise<DryRunResult> {
    try {
      this.validateBigQueryAvailability();

      const [job] = await this.bigquery.createQueryJob({
        query,
        dryRun: true,
        location: this.configService.get<string>('bigquery.location'),
      });
      const metadata = job.metadata;
      if (!metadata) {
        throw new Error('Metadata não disponível');
      }
      return {
        schema: metadata.schema,
        totalBytesProcessed: Number(metadata.totalBytesProcessed) || 0,
      };
    } catch (error: unknown) {
      if (error instanceof BigQueryExecutionError) {
        throw error;
      }

      const err = error as Error;
      this.logger.error(`Erro no dry run: ${err.message}`, err.stack);
      throw new BigQueryExecutionError(
        `Erro no dry run: ${err.message}`,
        query,
        err
      );
    }
  }

  /**
   * Obtém o schema de uma tabela
   * @param datasetId ID do dataset
   * @param tableId ID da tabela
   * @returns Schema da tabela
   */
  public async getTableSchema(datasetId: string, tableId: string): Promise<unknown> {
    try {
      this.validateBigQueryAvailability();

      const [metadata] = await this.bigquery.dataset(datasetId).table(tableId).getMetadata();
      return metadata.schema;
    } catch (error: unknown) {
      if (error instanceof BigQueryExecutionError) {
        throw error;
      }

      const err = error as Error;
      this.logger.error(`Erro ao obter schema: ${err.message}`, err.stack);
      throw new BigQueryExecutionError(
        `Erro ao obter schema: ${err.message}`,
        `SELECT * FROM ${datasetId}.${tableId} LIMIT 0`,
        err
      );
    }
  }
}
