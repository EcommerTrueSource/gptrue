export interface QueryOptions {
  maximumBytesBilled?: string;
  timeoutMs?: number;
}

export interface QueryMetadata {
  totalRows: number;
  processedAt: string;
}

export interface QueryResult {
  rows: any[];
  metadata: QueryMetadata;
} 