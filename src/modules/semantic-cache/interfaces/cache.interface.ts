export interface CacheTemplate {
  id: string;
  question: string;
  questionEmbedding: number[];
  query?: string;
  queryResult?: any;
  response: string;
  metadata: {
    createdAt: Date;
    updatedAt: Date;
    version: string;
    executionTimeMs: number;
    sourceTables: string[];
  };
  feedback: {
    positive: number;
    negative: number;
    comments: string[];
    needsReview: boolean;
  };
  ttl?: Date;
}

export interface SimilaritySearchResult {
  id: string;
  score: number;
  template: CacheTemplate;
}

export interface CacheConfig {
  similarityThreshold: number;
  ttlEnabled: boolean;
  ttlDays: number;
  namespace: string;
}

/**
 * Interface para armazenar informações estruturadas extraídas de perguntas
 */
export interface QueryInformation {
  queryType: 'topN' | 'position' | 'unknown';
  position: number;
  topN: number;
  timeframe: {
    month: string;
    year: string;
  };
  entities: Array<{
    type: string;
    value: string;
  }>;
  metrics: string[];
  isPositionQuery: boolean;
  isTopNQuery: boolean;
  originalText: string;
}
