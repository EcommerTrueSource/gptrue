import { ConversationRequestDto, ConversationResponseDto } from '../../api-gateway/dtos/conversation.dto';
import { FeedbackRequestDto, FeedbackResponseDto } from '../../api-gateway/dtos/feedback-request.dto';

export interface MetricsResponse {
  performance: {
    averageResponseTimeMs: number;
    cacheHitRate: number;
    resourceUsage: {
      cpu: number;
      memory: number;
      requests: number;
    };
  };
  quality: {
    positiveFeedbackRate: number;
    accuracy: number;
    abandonmentRate: number;
  };
  costs: {
    vertexAiCost: number;
    bigQueryCost: number;
    pineconeCost: number;
  };
}

export interface Template {
  id: string;
  question: string;
  sql: string;
  usage: {
    hits: number;
    lastUsed: string;
  };
  feedback: {
    positive: number;
    negative: number;
    comments: string[];
    needsReview: boolean;
    categories?: string[];
    lastFeedbackDate?: string;
  };
}

export interface TemplateListResponse {
  templates: Template[];
  metadata: {
    total: number;
    filtered: number;
    page: number;
    pageSize: number;
  };
}

export interface TemplateUpdateRequest {
  sql?: string;
  response?: string;
  metadata?: {
    confidence?: number;
    ttl?: number;
  };
}

export interface CacheClearOptions {
  type?: 'all' | 'type' | 'period' | 'performance';
  olderThan?: string;
  minConfidence?: number;
}

export interface CacheClearResponse {
  clearedTemplates: number;
  affectedQueries: number;
  timestamp: string;
}

export interface HealthCheckResponse {
  status: 'healthy' | 'degraded' | 'unhealthy';
  components: {
    [key: string]: {
      status: 'ok' | 'error' | 'warning';
      latency: number;
    };
  };
  resources: {
    [key: string]: {
      usage: number;
      status: 'ok' | 'warning' | 'error';
    };
  };
  lastCheck: string;
}

export interface IOrchestratorService {
  // Conversação
  processConversation(request: ConversationRequestDto): Promise<ConversationResponseDto>;
  getConversation(id: string): Promise<ConversationResponseDto>;
  processFeedback(request: FeedbackRequestDto): Promise<FeedbackResponseDto>;

  // Métricas e Monitoramento
  getMetrics(startDate?: string, endDate?: string): Promise<MetricsResponse>;
  checkHealth(): Promise<HealthCheckResponse>;

  // Gestão de Templates
  listTemplates(type?: string, minConfidence?: number): Promise<TemplateListResponse>;
  updateTemplate(id: string, template: TemplateUpdateRequest): Promise<Template>;
  deleteTemplate(id: string): Promise<void>;
  clearCache(options: CacheClearOptions): Promise<CacheClearResponse>;
}
