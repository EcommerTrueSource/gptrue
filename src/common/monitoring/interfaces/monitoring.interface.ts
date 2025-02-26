/**
 * Tipos de métricas
 */
export enum MetricType {
  RESPONSE_TIME = 'responseTime',
  CACHE_HIT_RATE = 'cacheHitRate',
  SQL_GENERATION = 'sqlGeneration',
  FEEDBACK = 'feedback',
  API_COST = 'apiCost',
  ERROR = 'error',
}

/**
 * Interface para métricas
 */
export interface Metrics {
  responseTime: {
    total: number[];
    byComponent: Record<string, number[]>;
  };
  cacheHitRate: {
    semantic: { hits: number; misses: number };
    redis: { hits: number; misses: number };
  };
  sqlGeneration: {
    success: number;
    failure: number;
  };
  feedback: {
    positive: number;
    negative: number;
  };
  apiCosts: {
    vertexAI: number;
    openAI: number;
  };
  errors: Array<{
    component: string;
    message: string;
    stack?: string;
    timestamp: Date;
  }>;
}

/**
 * Interface para limiares de alerta
 */
export interface AlertThresholds {
  responseTime: number;
  cacheHitRate: number;
  sqlGenerationFailureRate: number;
  negativeFeedbackRate: number;
  errorRate: number;
}

/**
 * Interface para métricas agregadas
 */
export interface AggregatedMetrics {
  avgResponseTime: number;
  semanticCacheHitRate: number;
  redisCacheHitRate: number;
  sqlGenerationSuccessRate: number;
  positiveFeedbackRate: number;
  totalApiCosts: number;
  errorCount: number;
  recentErrorCount: number;
}
