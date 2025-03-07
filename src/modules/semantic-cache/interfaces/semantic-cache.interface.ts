import { Template, TemplateUpdateRequest, CacheClearOptions } from '../../orchestrator/interfaces/orchestrator.interface';
import { ProcessingResult } from '../../orchestrator/interfaces/conversation.interface';
import { FeedbackType } from '../../api-gateway/dtos/feedback-request.dto';

export const SEMANTIC_CACHE_SERVICE = 'SEMANTIC_CACHE_SERVICE';

export interface HealthStatus {
  status: 'ok' | 'error' | 'warning';
  latency: number;
}

export interface CacheClearResult {
  clearedTemplates: number;
  affectedQueries: number;
  timestamp: string;
}

export interface ConversationContext {
  previousQuestions?: string[];
  topics?: string[];
  entities?: string[];
}

export interface FeedbackData {
  type: FeedbackType;
  helpful: boolean;
  comment?: string;
}

export interface ISemanticCacheService {
  findSimilarQuestion(question: string, context?: ConversationContext, conversationId?: string): Promise<ProcessingResult | null>;
  storeResult(question: string, result: ProcessingResult, conversationId?: string, context?: ConversationContext): Promise<void>;
  updateFeedback(question: string, feedback: FeedbackData, conversationId?: string, context?: ConversationContext, recordId?: string): Promise<void>;
  deleteRecord(id: string): Promise<boolean>;
  clearCache(options?: CacheClearOptions): Promise<CacheClearResult>;
  listTemplates(type?: string, minConfidence?: number): Promise<Template[]>;
  updateTemplate(id: string, template: TemplateUpdateRequest): Promise<Template>;
  deleteTemplate(id: string): Promise<void>;
  checkHealth(): Promise<HealthStatus>;
  checkConnection(): Promise<boolean>;
}
