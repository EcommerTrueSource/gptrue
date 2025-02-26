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
  context: Record<string, any>;
  metadata: {
    createdAt: Date;
    updatedAt: Date;
    totalInteractions: number;
    lastProcessingTimeMs?: number;
  };
}

export interface ConversationMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  metadata?: MessageMetadata;
  feedback?: MessageFeedback;
}

export interface MessageMetadata {
  source?: 'cache' | 'query';
  processingTimeMs?: number;
  confidence?: number;
  [key: string]: any;
}

export interface MessageFeedback {
  type: 'positive' | 'negative';
  comment?: string;
  timestamp: Date;
}

export interface ProcessingResult {
  message: string;
  metadata: MessageMetadata;
  data?: any;
  suggestions?: string[];
}

export interface QueryResult {
  rows: Record<string, any>[];
  metadata: {
    totalRows: number;
    processedBytes: number;
    executionTimeMs: number;
  };
}

export interface GeneratedResponse {
  message: string;
  metadata: MessageMetadata;
  suggestions?: string[];
}
