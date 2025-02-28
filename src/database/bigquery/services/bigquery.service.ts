import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BigQuery } from '@google-cloud/bigquery';
import * as path from 'path';
import { IBigQueryService, QueryResult } from '../interfaces/bigquery.interface';

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
    try {
      const [rows] = await this.bigquery.query({
        query,
        params,
        location: 'US',
      });

      const executionTime = Date.now() - startTime;

      return {
        rows: rows as T[],
        metadata: {
          totalRows: rows.length,
          processedBytes: 0, // Não é possível obter esse valor após a execução
          executionTimeMs: executionTime,
        },
      };
    } catch (error) {
      this.logger.error(`Erro ao executar query: ${error instanceof Error ? error.message : String(error)}`);
      throw new Error(`Erro ao executar query: ${error instanceof Error ? error.message : String(error)}`);
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
