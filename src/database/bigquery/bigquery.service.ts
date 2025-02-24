import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BigQuery, Query } from '@google-cloud/bigquery';
import { BigQueryExecutionError } from './errors/bigquery-execution.error';
import { QueryOptions, QueryResult } from './interfaces/bigquery.interface';

@Injectable()
export class BigQueryService {
  private readonly logger = new Logger(BigQueryService.name);
  private bigquery: BigQuery;
  
  constructor(private readonly configService: ConfigService) {
    this.initializeBigQuery();
  }

  private initializeBigQuery() {
    try {
      this.bigquery = new BigQuery({
        projectId: this.configService.get<string>('BIGQUERY_PROJECT_ID'),
        keyFilename: this.configService.get<string>('BIGQUERY_KEY_FILE'),
      });
      this.logger.log('BigQuery inicializado com sucesso');
    } catch (error) {
      this.logger.error('Erro ao inicializar BigQuery:', error);
      throw new Error('Falha na inicialização do BigQuery');
    }
  }

  async executeQuery(query: string, options: QueryOptions = {}): Promise<QueryResult> {
    try {
      this.logger.debug(`Executando query: ${query}`);
      
      const queryOptions: Query = {
        query,
        maximumBytesBilled: options.maximumBytesBilled || this.configService.get<string>('BIGQUERY_MAX_BYTES'),
        jobTimeoutMs: options.timeoutMs || 30000,
        useLegacySql: false,
      };

      const [rows] = await this.bigquery.query(queryOptions);
      
      this.logger.debug(`Query executada com sucesso. Resultados: ${rows.length}`);
      
      return {
        rows,
        metadata: {
          totalRows: rows.length,
          processedAt: new Date().toISOString(),
        }
      };
    } catch (error) {
      this.logger.error('Erro ao executar query:', error);
      throw new BigQueryExecutionError(
        `Erro ao executar query: ${error.message}`,
        query,
        error
      );
    }
  }

  async validateQuery(query: string): Promise<boolean> {
    try {
      const [job] = await this.bigquery.createQueryJob({
        query,
        dryRun: true,
      });
      
      this.logger.debug(`Query validada com sucesso. Custo estimado: ${job.metadata.totalBytesProcessed} bytes`);
      
      return true;
    } catch (error) {
      this.logger.warn('Query inválida:', error);
      return false;
    }
  }

  async getTableSchema(datasetId: string, tableId: string): Promise<any> {
    try {
      const [metadata] = await this.bigquery
        .dataset(datasetId)
        .table(tableId)
        .getMetadata();
      
      return metadata.schema;
    } catch (error) {
      this.logger.error(`Erro ao obter schema da tabela ${datasetId}.${tableId}:`, error);
      throw new Error(`Falha ao obter schema da tabela: ${error.message}`);
    }
  }
} 