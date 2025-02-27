import { ConversationRequest, ConversationResponse, FeedbackDto, ValidationResult, QueryCostEstimate, CacheTemplate } from './dtos';

export interface OrchestratorService {
  processConversation(request: ConversationRequest): Promise<ConversationResponse>;
  processFeedback(conversationId: string, feedback: FeedbackDto): Promise<any>;
}

export interface SemanticCacheService {
  findSimilarQuestion(question: string): Promise<CacheTemplate | null>;
  storeResult(question: string, result: any): Promise<boolean>;
  updateFeedback(templateId: string, feedback: FeedbackDto): Promise<void>;
  invalidateTemplate(templateId: string): Promise<boolean>;
}

export interface QueryGeneratorService {
  generateSQL(question: string): Promise<string>;
}

export interface QueryValidatorService {
  validateQuery(query: string): Promise<ValidationResult>;
  estimateQueryCost(query: string): Promise<QueryCostEstimate>;
}

export interface ResponseGeneratorService {
  generateResponse(data: any, context: {
    pergunta: string;
    query: string;
    tables: string[];
  }): Promise<ConversationResponse>;
  formatResponse(data: any[], type: 'table' | 'time-series'): Promise<string>;
}

export interface FeedbackService {
  processFeedback(feedback: FeedbackDto): Promise<boolean>;
}
