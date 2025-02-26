import { GeneratedQuery } from '../../query-generator/interfaces/query-generator.interface';

export interface ValidationResult {
  isValid: boolean;
  errors?: ValidationError[];
  warnings?: ValidationWarning[];
  estimatedCost?: QueryCostEstimate;
  optimizations?: QueryOptimization[];
}

export interface ValidationError {
  code: string;
  message: string;
  line?: number;
  column?: number;
  severity: 'error';
}

export interface ValidationWarning {
  code: string;
  message: string;
  line?: number;
  column?: number;
  severity: 'warning';
}

export interface QueryCostEstimate {
  processingBytes: number;
  processingTime: string;
  estimatedCost: number;
  affectedRows: number;
}

export interface QueryOptimization {
  type: 'partition' | 'clustering' | 'filter' | 'join' | 'materialization';
  description: string;
  recommendation: string;
  estimatedImpact: {
    processingBytes?: number;
    processingTime?: string;
    costReduction?: number;
  };
}

export interface QueryResult {
  data: any[];
  metadata: {
    schema: QueryResultField[];
    totalRows: number;
    processingTime: string;
    bytesProcessed: number;
    cacheHit: boolean;
  };
}

export interface QueryResultField {
  name: string;
  type: string;
  mode: 'NULLABLE' | 'REQUIRED' | 'REPEATED';
  description?: string;
}

export interface SecurityPolicy {
  allowedOperations: ('SELECT' | 'INSERT' | 'UPDATE' | 'DELETE')[];
  maxBytesProcessed: number;
  maxRows: number;
  allowedTables: string[];
  restrictedColumns: {
    table: string;
    columns: string[];
  }[];
}

export interface QueryValidationResult {
  isValid: boolean;
  query: string;
  message: string;
  fields?: Array<{
    name: string;
    type: string;
    mode: string;
    description?: string;
  }>;
  statistics?: {
    totalBytesProcessed: number;
  };
}

export interface QueryField {
  name: string;
  type: string;
  mode: string;
  description?: string;
}

export interface QueryStatistics {
  totalBytesProcessed: number;
}

export interface DryRunResult {
  schema?: {
    fields: QueryField[];
  };
  totalBytesProcessed: number;
}
