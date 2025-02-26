import { HealthStatus } from '../../../modules/semantic-cache/interfaces/semantic-cache.interface';

export const BIGQUERY_SERVICE = 'BIGQUERY_SERVICE';

export interface QueryOptions {
  maximumBytesBilled?: string;
  timeoutMs?: number;
}

export interface QueryMetadata {
  totalRows: number;
  processedAt: string;
}

export interface QueryResult<T = any> {
  rows: T[];
  metadata: {
    totalRows: number;
    processedBytes: number;
    executionTimeMs: number;
  };
}

export interface IBigQueryService {
  executeQuery<T = any>(sql: string, params?: Record<string, any>): Promise<QueryResult<T>>;
  validateQuery(sql: string): Promise<boolean>;
  estimateCost(sql: string): Promise<number>;
  getSchema(table: string): Promise<Record<string, any>>;
  checkHealth(): Promise<boolean>;
}
