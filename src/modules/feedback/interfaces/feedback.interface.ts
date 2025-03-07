import { Template } from '../../orchestrator/interfaces/orchestrator.interface';
import { FeedbackDto } from '../dtos/feedback.dto';

/**
 * Interface para categorização de feedback por categoria
 */
export interface CategoryFeedback {
  total: number;
  positive: number;
  negative: number;
}

/**
 * Interface para análise de feedback
 */
export interface FeedbackAnalytics {
  totalFeedback: number;
  positiveFeedback: number;
  negativeFeedback: number;
  feedbackByCategory: Record<string, CategoryFeedback>;
  recentNegativeFeedback: NegativeFeedbackEntry[];
}

/**
 * Interface para entrada de feedback negativo recente
 */
export interface NegativeFeedbackEntry {
  question: string;
  timestamp: Date;
  category?: string;
  comment?: string;
}

/**
 * Interface para padrão de feedback identificado
 */
export interface FeedbackPattern {
  category: string;
  count: number;
  percentage: number;
}

/**
 * Interface para o serviço de feedback
 */
export interface IFeedbackService {
  /**
   * Registra feedback positivo para um template
   * @param templateId ID do template
   * @param comment Comentário opcional
   * @param categories Categorias opcionais
   */
  registerPositiveFeedback(
    templateId: string,
    comment?: string,
    categories?: string[]
  ): Promise<void>;

  /**
   * Registra feedback negativo para um template
   * @param templateId ID do template
   * @param comment Comentário opcional
   * @param categories Categorias opcionais
   */
  registerNegativeFeedback(
    templateId: string,
    comment?: string,
    categories?: string[]
  ): Promise<void>;

  /**
   * Obtém estatísticas de feedback para um template
   * @param templateId ID do template
   */
  getFeedbackStats(templateId: string): Promise<{
    positive: number;
    negative: number;
    needsReview: boolean;
    comments?: string[];
    categories?: string[];
  }>;

  /**
   * Marca um template para revisão
   * @param templateId ID do template
   * @param reason Motivo da revisão
   */
  markTemplateForReview(templateId: string, reason: string): Promise<void>;

  /**
   * Processa feedback do usuário
   * @param feedback Feedback do usuário
   * @returns Confirmação de processamento
   */
  processFeedback(feedback: FeedbackDto): Promise<any>;

  /**
   * Obtém análise de feedback
   * @returns Análise de feedback
   */
  getAnalytics(): FeedbackAnalytics;

  /**
   * Identifica padrões em feedback negativo
   * @returns Padrões identificados
   */
  identifyNegativeFeedbackPatterns(): FeedbackPattern[];
}

/**
 * Token de injeção para o serviço de feedback
 */
export const FEEDBACK_SERVICE = 'FEEDBACK_SERVICE';
