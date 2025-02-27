export interface ResponseContext {
  question: string;
  queryResult?: any;
  data?: any[];
  query?: string;
  tables?: string[];
  metadata?: {
    startTime: Date | number;
  };
  config?: {
    language?: string;
    format?: string;
    includeMetadata?: boolean;
  };
}

export interface GeneratedResponse {
  message: string;
  suggestions?: string[];
  metadata: {
    processingTimeMs: number;
    source: 'cache' | 'query';
    confidence: number;
    tables?: string[];
    sql?: string;
  };
}
