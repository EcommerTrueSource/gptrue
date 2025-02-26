import { Template, TemplateUpdateRequest, CacheClearOptions } from '../../orchestrator/interfaces/orchestrator.interface';

export const SEMANTIC_CACHE_SERVICE = 'SEMANTIC_CACHE_SERVICE';

export interface HealthStatus {
  status: 'ok' | 'error' | 'warning';
  latency: number;
}

export interface CacheClearResult {
  clearedTemplates: number;
  affectedQueries: number;
}

export interface ISemanticCacheService {
  findSimilarQuestion(question: string): Promise<any>;
  storeResult(question: string, result: any): Promise<void>;
  updateFeedback(question: string, feedback: any): Promise<void>;
  listTemplates(type?: string, minConfidence?: number): Promise<Template[]>;
  updateTemplate(id: string, template: TemplateUpdateRequest): Promise<Template>;
  deleteTemplate(id: string): Promise<void>;
  clearCache(options: CacheClearOptions): Promise<CacheClearResult>;
  checkHealth(): Promise<HealthStatus>;
}
