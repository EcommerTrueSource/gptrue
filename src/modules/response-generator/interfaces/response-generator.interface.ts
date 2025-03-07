/**
 * Tipos de fonte de resposta
 */
export type ResponseSource = 'query' | 'cache';

/**
 * Interface para contexto de resposta
 */
export interface ResponseContext {
  question: string;
  queryResult?: any;
  metadata?: {
    startTime: number;
    [key: string]: any;
  };
  config?: {
    language?: string;
    format?: string;
    includeMetadata?: boolean;
  };
}

/**
 * Interface para resultado de consulta
 */
export interface QueryResult {
  data?: any[];
  rows?: any[];
  metadata?: {
    schema: QueryResultField[];
    totalRows: number;
    processingTime: string;
    bytesProcessed: number;
    cacheHit: boolean;
    sql?: string;
    estimatedCost?: number;
    originalQuestion?: string;
    currentQuestion?: string;
    originalResponse?: string;
  };
}

/**
 * Interface para campo de resultado de consulta
 */
export interface QueryResultField {
  name: string;
  type: string;
  mode?: string;
  description?: string;
}

/**
 * Interface para configuração do gerador de resposta
 */
export interface ResponseGeneratorConfig {
  language: string;
  includeSQL: boolean;
  includeVisualization: boolean;
  maxSuggestions: number;
  confidenceThreshold: number;
}

/**
 * Interface para resposta gerada
 */
export interface GeneratedResponse {
  message: string;
  metadata: {
    processingTimeMs: number;
    source: string;
    confidence: number;
    tables: string[];
    sql?: string;
  };
}

/**
 * Interface para dados de resposta
 */
export interface ResponseData {
  type: 'table' | 'scalar' | 'chart';
  content: any;
  visualization?: {
    type: 'bar' | 'line' | 'pie' | 'scatter';
    options: any;
  };
}

export interface ResponseTemplate {
  type: 'table' | 'scalar' | 'chart';
  template: string;
  examples: {
    data: any;
    response: string;
  }[];
}

export interface OpenAIPrompt {
  system: string;
  user: string;
  examples?: {
    user: string;
    assistant: string;
  }[];
}

export interface GenerateResponseParams {
  question: string;
  queryResult?: QueryResult;
  data?: any;
  query?: string;
  tables?: string[];
  metadata: {
    startTime: number;
    adaptFromCache?: boolean;
  };
}

export interface IResponseGeneratorService {
  generateResponse(params: GenerateResponseParams): Promise<any>;
}
