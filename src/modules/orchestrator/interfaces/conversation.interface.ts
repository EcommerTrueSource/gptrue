export interface ConversationRequest {
  message: string;
  conversationId?: string;
  context?: {
    timeRange?: {
      start: Date;
      end: Date;
    };
    filters?: Record<string, any>;
    preferredVisualization?: string;
  };
  options?: {
    maxResultRows?: number;
    includeSql?: boolean;
    timeout?: number;
  };
}

export interface ConversationResponse {
  id: string;
  conversationId: string;
  message: string;
  metadata: {
    processingTimeMs: number;
    source: 'cache' | 'query' | 'development';
    confidence: number;
    tables?: string[];
    sql?: string;
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

export interface ConversationState {
  id: string;
  userId: string;
  messages: ConversationMessage[];
  context: {
    timeRange?: {
      start: string;
      end: string;
    };
    filters?: Record<string, any>;
    preferredVisualization?: string;
  };
  metadata: {
    createdAt: Date;
    updatedAt: Date;
    lastProcessingTimeMs?: number;
    totalInteractions: number;
  };
}

export interface ConversationMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  metadata?: {
    processingTimeMs?: number;
    source?: 'cache' | 'query';
    confidence?: number;
    tables?: string[];
    sql?: string;
  };
  feedback?: {
    type: 'positive' | 'negative';
    comment?: string;
    timestamp: Date;
  };
}

export interface ProcessingResult {
  message: string;
  metadata: {
    processingTimeMs: number;
    source: 'cache' | 'query';
    confidence: number;
    tables?: string[];
    sql?: string;
  };
  data?: {
    type: 'table' | 'scalar' | 'chart';
    content: any;
  };
  suggestions?: string[];
} 