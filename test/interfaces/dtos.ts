export interface ConversationRequest {
  message: string;
  conversationId?: string;
  context?: {
    timeRange?: {
      start: Date;
      end: Date;
    };
    filters?: Record<string, any>;
  };
}

export interface ConversationResponse {
  id: string;
  conversationId: string;
  message: string;
  metadata: {
    processingTimeMs: number;
    source: 'cache' | 'query';
    confidence: number;
    tables?: string[];
  };
  data?: {
    type: 'table' | 'scalar' | 'chart';
    content: any;
  };
  suggestions?: string[];
  feedbackOptions: {
    thumbsUp: boolean;
    thumbsDown: boolean;
    commentEnabled: boolean;
  };
}

export interface FeedbackDto {
  question: string;
  conversationId: string;
  responseId: string;
  type: 'positive' | 'negative';
  comment?: string;
}

export interface ValidationResult {
  isValid: boolean;
  optimizedQuery?: string | null;
  errors?: string[];
}

export interface QueryCostEstimate {
  bytesProcessed: number;
  estimatedCost: number;
  isExpensive: boolean;
}

export interface CacheTemplate {
  id: string;
  question: string;
  response: string;
  metadata: {
    source: 'cache' | 'query';
    confidence: number;
    tables: string[];
    processingTimeMs: number;
  };
}
