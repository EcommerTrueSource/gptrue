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
  private readonly config: any;

  constructor(private readonly configService: ConfigService) {
    this.logger.debug('Iniciando BigQueryService...');

    this.enabled = this.configService.get<boolean>('bigquery.enabled');
    this.logger.debug(`BigQuery enabled: ${this.enabled}`);

    if (!this.enabled) {
      this.logger.warn('BigQuery está desabilitado pela configuração');
      this.bigquery = null;
      return;
    }

    try {
      const projectId = this.configService.get<string>('bigquery.projectId');
      const credentials = this.configService.get('bigquery.credentials');

      this.logger.debug('Configurações do BigQuery:', {
        projectId,
        clientEmail: credentials?.credentials?.client_email,
        enabled: this.enabled
      });

      if (!projectId) {
        throw new Error('projectId não configurado');
      }

      if (!credentials?.credentials?.client_email || !credentials?.credentials?.private_key) {
        throw new Error('Credenciais do Google Cloud não configuradas');
      }

      this.config = { projectId, credentials };

      this.logger.debug('Criando instância do BigQuery...');
      this.bigquery = new BigQuery(this.config);

      this.logger.debug('Iniciando teste de conexão...');
      this.initialize().catch(error => {
        this.logger.error('Falha ao inicializar BigQuery:', {
          error: error.message,
          stack: error.stack,
          config: {
            ...this.config,
            credentials: '***REDACTED***'
          }
        });
      });
    } catch (error: unknown) {
      const err = error as Error;
      this.logger.error(`Falha ao configurar BigQuery: ${err.message}`, {
        error: err.message,
        stack: err.stack,
        config: {
          ...this.config,
          credentials: '***REDACTED***'
        }
      });
      this.bigquery = null;
      this.enabled = false;
    }
  }

  private async initialize() {
    try {
      const dataset = this.configService.get<string>('bigquery.dataset');
      if (!dataset) {
        throw new Error('Dataset não configurado');
      }

      this.logger.debug(`Testando conexão com dataset: ${dataset}`);
      const [datasetInfo] = await this.bigquery.dataset(dataset).get();

      this.logger.log('BigQuery inicializado com sucesso', {
        dataset: datasetInfo.id,
        location: datasetInfo.location
      });
    } catch (error) {
      const err = error as Error;
      this.logger.error('Erro ao inicializar BigQuery:', {
        message: err.message,
        stack: err.stack,
        config: {
          ...this.config,
          dataset: this.configService.get<string>('bigquery.dataset')
        }
      });
      throw error;
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

  async query<T = any>(query: string): Promise<T[]> {
    try {
      const options = {
        query,
        location: this.configService.get<string>('bigquery.location'),
        maximumBytesBilled: String(this.configService.get<number>('bigquery.maxBytesProcessed')),
      };

      const [rows] = await this.bigquery.query(options);
      return rows as T[];
    } catch (error) {
      this.logger.error('Erro ao executar query no BigQuery', { error, query });
      throw error;
    }
  }
}
