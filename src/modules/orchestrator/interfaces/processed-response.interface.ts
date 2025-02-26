import { QueryResult } from '../../../database/bigquery/interfaces/bigquery.interface';

export interface ProcessedResponseMetadata {
  processedAt: string;
  success: boolean;
  error?: string;
}

export interface ProcessedResponse {
  question: string;
  sql: string;
  result: QueryResult;
  response: string;
  metadata: ProcessedResponseMetadata;
}
