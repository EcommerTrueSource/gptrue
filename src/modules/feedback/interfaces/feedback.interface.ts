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
 * Interface para feedback por categoria
 */
export interface CategoryFeedback {
  total: number;
  positive: number;
  negative: number;
}

/**
 * Interface para entrada de feedback negativo
 */
export interface NegativeFeedbackEntry {
  question: string;
  comment?: string;
  timestamp: Date;
  category?: string;
}

/**
 * Interface para padrões de feedback
 */
export interface FeedbackPattern {
  category: string;
  count: number;
  percentage: number;
}
