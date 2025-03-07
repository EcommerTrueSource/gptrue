import { FeedbackType } from '../../api-gateway/dtos/feedback-request.dto';
import { QueryMetadataDto } from '../../api-gateway/dtos/conversation.dto';

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
  messages: ConversationMessage[];
  metadata: ConversationMetadata;
  lastResult?: ProcessingResult;
}

export interface ConversationMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  originalQuestion?: string;
  metadata?: MessageMetadata;
  feedback?: MessageFeedback;
}

export interface MessageMetadata {
  source: 'cache' | 'generated' | 'error' | 'conversational';
  confidence?: number;
  processingTimeMs: number;
  needsReview?: boolean;
  tables?: string[];
  sql?: string;
  cacheId?: string;
  isExactMatch?: boolean;
  originalQuestion?: string;
  currentQuestion?: string;
  adaptedFromCache?: boolean;
  adaptationContext?: {
    uniqueCurrentTokens?: string[];
    uniqueOriginalTokens?: string[];
    currentNumbers?: string[];
    originalNumbers?: string[];
    usageCount?: number;
    feedbackPositive?: number;
    feedbackNegative?: number;
    [key: string]: any;
  };
  error?: {
    type: string;
    details: string;
  };
}

export interface MessageFeedback {
  type: FeedbackType;
  helpful: boolean;
  comment?: string;
  timestamp: Date;
}

export interface ProcessingResult {
  message: string;
  metadata: MessageMetadata;
  data?: {
    type: 'table' | 'scalar' | 'chart';
    content: any;
  };
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
  data?: {
    type: 'table' | 'scalar' | 'chart';
    content: any;
  };
  suggestions?: string[];
}

export interface ConversationMetadata {
  createdAt: Date;
  updatedAt: Date;
  totalInteractions: number;
  lastProcessingTimeMs?: number;
  hasFeedback?: boolean;
}
