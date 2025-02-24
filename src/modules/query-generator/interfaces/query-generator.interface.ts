export interface TableSchema {
  name: string;
  description: string;
  fields: TableField[];
  relationships: TableRelationship[];
  commonQueries?: QueryExample[];
}

export interface TableField {
  name: string;
  type: string;
  description: string;
  examples?: string[];
  isRequired?: boolean;
  isSearchable?: boolean;
}

export interface TableRelationship {
  table: string;
  field: string;
  foreignField: string;
  type: 'one-to-one' | 'one-to-many' | 'many-to-many';
  description?: string;
}

export interface QueryExample {
  description: string;
  query: string;
  context?: Record<string, any>;
}

export interface QueryContext {
  timeRange?: {
    start: string;
    end: string;
  };
  filters?: Record<string, any>;
  preferredVisualization?: string;
}

export interface GeneratedQuery {
  sql: string;
  tables: string[];
  parameters?: Record<string, any>;
  estimatedCost?: {
    processingBytes: number;
    processingTime: string;
  };
  warnings?: string[];
} 