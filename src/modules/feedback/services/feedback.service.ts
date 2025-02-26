import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SemanticCacheService } from '../../semantic-cache/services/semantic-cache.service';
import { FeedbackDto } from '../dtos/feedback.dto';
import { FeedbackAnalytics } from '../interfaces/feedback.interface';

@Injectable()
export class FeedbackService {
  private readonly logger = new Logger(FeedbackService.name);
  private feedbackAnalytics: FeedbackAnalytics = {
    totalFeedback: 0,
    positiveFeedback: 0,
    negativeFeedback: 0,
    feedbackByCategory: {},
    recentNegativeFeedback: [],
  };

  constructor(
    private configService: ConfigService,
    private semanticCacheService: SemanticCacheService,
  ) {}

  /**
   * Processa o feedback do usuário
   * @param feedback Feedback do usuário
   * @returns Confirmação de processamento
   */
  async processFeedback(feedback: FeedbackDto): Promise<{ success: boolean; message: string }> {
    try {
      this.logger.debug('Iniciando processamento de feedback', {
        type: feedback.type,
        category: feedback.category,
        hasComment: !!feedback.comment,
      });

      // Validar feedback
      this.validateFeedback(feedback);

      // Atualizar o template no cache semântico
      await this.semanticCacheService.updateFeedback(feedback.question, {
        type: feedback.type,
        comment: feedback.comment,
      });

      // Atualizar métricas internas
      this.updateAnalytics(feedback);

      // Verificar se precisa de revisão
      if (feedback.type === 'negative') {
        this.addToReviewQueue(feedback);
      }

      this.logger.log('Feedback processado com sucesso', {
        type: feedback.type,
        category: feedback.category,
      });

      return {
        success: true,
        message: 'Feedback processado com sucesso',
      };
    } catch (error: unknown) {
      const err = error as Error;
      this.logger.error('Erro ao processar feedback', {
        error: err.message,
        stack: err.stack,
        feedback: {
          type: feedback.type,
          category: feedback.category,
        },
      });

      return {
        success: false,
        message: `Erro ao processar feedback: ${err.message}`,
      };
    }
  }

  /**
   * Obtém métricas de feedback
   * @returns Métricas de feedback
   */
  getAnalytics(): FeedbackAnalytics {
    return this.feedbackAnalytics;
  }

  /**
   * Valida o feedback recebido
   * @param feedback Feedback para validar
   * @throws Error se o feedback for inválido
   */
  private validateFeedback(feedback: FeedbackDto): void {
    if (!feedback.question) {
      throw new Error('A pergunta é obrigatória');
    }
    if (!feedback.type || !['positive', 'negative'].includes(feedback.type)) {
      throw new Error('Tipo de feedback inválido');
    }
    if (feedback.type === 'negative' && !feedback.comment) {
      throw new Error('Comentário obrigatório para feedback negativo');
    }
  }

  /**
   * Atualiza métricas de feedback
   * @param feedback Feedback do usuário
   */
  private updateAnalytics(feedback: FeedbackDto): void {
    this.feedbackAnalytics.totalFeedback++;

    if (feedback.type === 'positive') {
      this.feedbackAnalytics.positiveFeedback++;
    } else {
      this.feedbackAnalytics.negativeFeedback++;
    }

    // Atualizar por categoria se disponível
    if (feedback.category) {
      if (!this.feedbackAnalytics.feedbackByCategory[feedback.category]) {
        this.feedbackAnalytics.feedbackByCategory[feedback.category] = {
          total: 0,
          positive: 0,
          negative: 0,
        };
      }

      this.feedbackAnalytics.feedbackByCategory[feedback.category].total++;

      if (feedback.type === 'positive') {
        this.feedbackAnalytics.feedbackByCategory[feedback.category].positive++;
      } else {
        this.feedbackAnalytics.feedbackByCategory[feedback.category].negative++;
      }
    }
  }

  /**
   * Adiciona feedback negativo à fila de revisão
   * @param feedback Feedback negativo
   */
  private addToReviewQueue(feedback: FeedbackDto): void {
    const maxQueueSize = this.configService.get<number>('app.feedback.maxQueueSize') || 100;

    // Manter apenas os últimos N feedbacks negativos
    if (this.feedbackAnalytics.recentNegativeFeedback.length >= maxQueueSize) {
      this.feedbackAnalytics.recentNegativeFeedback.shift();
    }

    this.feedbackAnalytics.recentNegativeFeedback.push({
      question: feedback.question,
      comment: feedback.comment,
      timestamp: new Date(),
      category: feedback.category,
    });

    this.logger.debug('Feedback negativo adicionado à fila de revisão', {
      question: feedback.question,
      category: feedback.category,
      queueSize: this.feedbackAnalytics.recentNegativeFeedback.length,
    });
  }

  /**
   * Identifica padrões em feedbacks negativos
   * @returns Padrões identificados
   */
  identifyNegativeFeedbackPatterns(): { category: string; count: number }[] {
    const categoryCounts: Record<string, number> = {};

    // Contar ocorrências por categoria
    this.feedbackAnalytics.recentNegativeFeedback.forEach(feedback => {
      const category = feedback.category || 'sem_categoria';
      categoryCounts[category] = (categoryCounts[category] || 0) + 1;
    });

    // Converter para array e ordenar
    return Object.entries(categoryCounts)
      .map(([category, count]) => ({ category, count }))
      .sort((a, b) => b.count - a.count);
  }
}
