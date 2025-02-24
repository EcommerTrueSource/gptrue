export interface QueryContext {
  tables: TableSchema[];
  timeRange?: {
    start: Date;
    end: Date;
  };
  filters?: Record<string, any>;
}

export interface TableSchema {
  name: string;
  description: string;
  fields: {
    name: string;
    type: string;
    description: string;
    examples: string[];
  }[];
  relationships: {
    table: string;
    field: string;
    foreignField: string;
    type: 'one-to-one' | 'one-to-many' | 'many-to-many';
  }[];
}

export interface SqlQueryResult {
  sql: string;
  params?: Record<string, any>;
  estimatedCost?: {
    processingBytes: number;
    estimatedCost: number;
  };
  metadata: {
    tables: string[];
    type: 'select' | 'aggregate';
    complexity: number;
  };
} 