import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BigQuery, Query } from '@google-cloud/bigquery';
import * as path from 'path';
import { IBigQueryService, QueryResult } from '../interfaces/bigquery.interface';
import { BigQueryExecutionError } from '../errors/bigquery-execution.error';
import { QueryOptions } from '../interfaces/bigquery.interface';
import { DryRunResult } from '../../../modules/query-validator/interfaces/query-validator.interface';

@Injectable()
export class BigQueryService implements IBigQueryService {
  private readonly bigquery: BigQuery;
  private readonly logger = new Logger(BigQueryService.name);
  private readonly datasetId: string;

  constructor(private readonly configService: ConfigService) {
    const projectId = this.configService.get<string>('bigquery.projectId') ||
                     this.configService.get<string>('BIGQUERY_PROJECT_ID') ||
                     process.env.BIGQUERY_PROJECT_ID ||
                     'truebrands-warehouse';

    const keyFilename = this.configService.get<string>('bigquery.keyFilename') ||
                       this.configService.get<string>('BIGQUERY_KEY_FILE') ||
                       process.env.BIGQUERY_KEY_FILE ||
                       './keys/bigquery-dev.json';

    this.datasetId = this.configService.get<string>('bigquery.dataset') ||
                    this.configService.get<string>('BIGQUERY_DATASET') ||
                    process.env.BIGQUERY_DATASET ||
                    'truebrands_warehouse';

    try {
      this.bigquery = new BigQuery({
        projectId,
        keyFilename: path.resolve(keyFilename),
      });
      this.logger.log(`BigQuery Service inicializado com sucesso. Project ID: ${projectId}, Dataset: ${this.datasetId}, Key File: ${keyFilename}`);
    } catch (error) {
      this.logger.error(`Erro ao inicializar BigQuery: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  async validateQuery(query: string): Promise<boolean> {
    try {
      const [job] = await this.bigquery.createQueryJob({
        query,
        dryRun: true,
      });
      return true;
    } catch (error) {
      this.logger.error(`Erro ao validar query: ${error instanceof Error ? error.message : String(error)}`);
      return false;
    }
  }

  async estimateCost(query: string): Promise<number> {
    try {
      const [job] = await this.bigquery.createQueryJob({
        query,
        dryRun: true,
      });
      return Number(job.metadata.statistics.totalBytesProcessed) || 0;
    } catch (error) {
      this.logger.error(`Erro ao estimar custo da query: ${error instanceof Error ? error.message : String(error)}`);
      throw new Error('Erro ao estimar custo da query');
    }
  }

  async executeQuery<T = any>(query: string, params?: Record<string, any>): Promise<QueryResult<T>> {
    const startTime = Date.now();
    this.logger.debug(`Executando query no BigQuery: ${query.substring(0, 200)}${query.length > 200 ? '...' : ''}`);

    try {
      // Primeiro, estimar o custo da consulta
      const bytesProcessed = await this.estimateCost(query);
      this.logger.debug(`Custo estimado da query: ${bytesProcessed} bytes`);

      // Configurar opções da consulta
      const queryOptions = {
        query,
        params,
        location: 'US',
        maximumBytesBilled: '1000000000', // 1GB como limite padrão
        timeoutMs: 60000, // 60 segundos como timeout padrão
      };

      // Executar a consulta
      const [rows] = await this.bigquery.query(queryOptions);

      const executionTime = Date.now() - startTime;
      this.logger.debug(`Query executada com sucesso em ${executionTime}ms. Retornando ${rows.length} linhas.`);

      return {
        rows: rows as T[],
        metadata: {
          totalRows: rows.length,
          processedBytes: bytesProcessed,
          executionTimeMs: executionTime,
        },
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const executionTime = Date.now() - startTime;

      this.logger.error(`Erro ao executar query após ${executionTime}ms: ${errorMessage}`);

      // Classificar o erro para melhor diagnóstico
      if (errorMessage.includes('timeout')) {
        throw new BigQueryExecutionError('A consulta excedeu o tempo limite de execução', query, error instanceof Error ? error : new Error(errorMessage));
      } else if (errorMessage.includes('quota')) {
        throw new BigQueryExecutionError('Cota do BigQuery excedida', query, error instanceof Error ? error : new Error(errorMessage));
      } else if (errorMessage.includes('syntax')) {
        throw new BigQueryExecutionError('Erro de sintaxe na consulta SQL', query, error instanceof Error ? error : new Error(errorMessage));
      } else if (errorMessage.includes('permission')) {
        throw new BigQueryExecutionError('Erro de permissão no BigQuery', query, error instanceof Error ? error : new Error(errorMessage));
      } else {
        throw new BigQueryExecutionError(`Erro ao executar query: ${errorMessage}`, query, error instanceof Error ? error : new Error(errorMessage));
      }
    }
  }

  async getSchema(table: string): Promise<Record<string, any>> {
    try {
      const [metadata] = await this.bigquery
        .dataset(this.datasetId)
        .table(table)
        .getMetadata();

      return metadata.schema?.fields || {};
    } catch (error) {
      this.logger.error(`Erro ao obter schema da tabela ${table}: ${error instanceof Error ? error.message : String(error)}`);
      throw new Error(`Erro ao obter schema da tabela ${table}`);
    }
  }

  async checkHealth(): Promise<boolean> {
    try {
      // Tenta listar datasets para verificar se a conexão está funcionando
      await this.bigquery.getDatasets();
      return true;
    } catch (error) {
      this.logger.error(`Erro ao verificar saúde do BigQuery: ${error instanceof Error ? error.message : String(error)}`);
      return false;
    }
  }
}
