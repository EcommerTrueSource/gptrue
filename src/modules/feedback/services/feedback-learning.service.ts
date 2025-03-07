import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Inject } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { SEMANTIC_CACHE_SERVICE, ISemanticCacheService } from '../../semantic-cache/interfaces/semantic-cache.interface';
import { FeedbackAnalytics, CategoryFeedback, FeedbackPattern, NegativeFeedbackEntry } from '../interfaces/feedback.interface';
import { Template } from '../../orchestrator/interfaces/orchestrator.interface';

/**
 * Serviço responsável por analisar feedbacks e melhorar os templates
 * com base nos padrões identificados.
 */
@Injectable()
export class FeedbackLearningService {
  private readonly logger = new Logger(FeedbackLearningService.name);

  constructor(
    private readonly configService: ConfigService,
    @Inject(SEMANTIC_CACHE_SERVICE)
    private readonly semanticCacheService: ISemanticCacheService,
  ) {}

  /**
   * Executa a análise de feedback mensalmente no primeiro dia do mês às 2h da manhã
   * Frequência configurada para baixo volume (<100 interações/dia)
   */
  @Cron('0 2 1 * *')
  async scheduledFeedbackAnalysis() {
    this.logger.log('[FEEDBACK_LEARNING] Iniciando análise agendada mensal de feedback');

    try {
      // Analisar feedback
      const analytics = await this.analyzeFeedback();

      // Identificar padrões
      const patterns = await this.identifyFeedbackPatterns();

      // Identificar templates para revisão
      const templatesForReview = await this.identifyTemplatesForReview();

      // Gerar relatório
      const report = await this.generateLearningReport();

      // Registrar estatísticas básicas
      this.logger.log(`[FEEDBACK_LEARNING] Análise mensal concluída: ${analytics.totalFeedback} feedbacks processados`);
      this.logger.log(`[FEEDBACK_LEARNING] ${patterns.length} padrões identificados`);
      this.logger.log(`[FEEDBACK_LEARNING] ${templatesForReview.length} templates precisam de revisão`);

      // Salvar relatório em arquivo (opcional)
      await this.saveReportToStorage(report);
    } catch (error) {
      this.logger.error(`[FEEDBACK_LEARNING] Erro na análise agendada: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Salva o relatório de feedback em um local de armazenamento
   * @param report Relatório a ser salvo
   */
  private async saveReportToStorage(report: string): Promise<void> {
    try {
      // Obter configuração de armazenamento
      const storageEnabled = this.configService.get<boolean>('FEEDBACK_REPORT_STORAGE_ENABLED', false);

      if (!storageEnabled) {
        this.logger.debug('[FEEDBACK_LEARNING] Armazenamento de relatórios desativado nas configurações');
        return;
      }

      // Aqui poderia ser implementada a lógica para salvar em um serviço de armazenamento
      // como Amazon S3, Google Cloud Storage, ou sistema de arquivos local

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const reportName = `feedback-report-${timestamp}.md`;

      this.logger.log(`[FEEDBACK_LEARNING] Relatório salvo como ${reportName}`);
    } catch (error) {
      this.logger.error(`[FEEDBACK_LEARNING] Erro ao salvar relatório: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Analisa os feedbacks coletados e identifica padrões
   * @returns Análise de feedback com estatísticas e padrões identificados
   */
  async analyzeFeedback(): Promise<FeedbackAnalytics> {
    this.logger.log('[FEEDBACK_LEARNING] Iniciando análise de feedback');

    try {
      // Buscar todos os templates com feedback
      const templates = await this.semanticCacheService.listTemplates();

      // Inicializar contadores
      let totalFeedback = 0;
      let positiveFeedback = 0;
      let negativeFeedback = 0;
      const feedbackByCategory: Record<string, CategoryFeedback> = {};
      const recentNegativeFeedback: NegativeFeedbackEntry[] = [];

      // Processar cada template
      for (const template of templates) {
        // Contabilizar feedback
        const positiveCount = template.feedback.positive || 0;
        const negativeCount = template.feedback.negative || 0;

        totalFeedback += positiveCount + negativeCount;
        positiveFeedback += positiveCount;
        negativeFeedback += negativeCount;

        // Processar categorias
        if (template.feedback.categories && template.feedback.categories.length > 0) {
          for (const category of template.feedback.categories) {
            if (!feedbackByCategory[category]) {
              feedbackByCategory[category] = {
                total: 0,
                positive: 0,
                negative: 0
              };
            }

            feedbackByCategory[category].total += positiveCount + negativeCount;
            feedbackByCategory[category].positive += positiveCount;
            feedbackByCategory[category].negative += negativeCount;
          }
        }

        // Coletar feedback negativo recente
        if (negativeCount > 0 && template.feedback.needsReview) {
          const entry: NegativeFeedbackEntry = {
            question: template.question,
            timestamp: new Date(template.feedback.lastFeedbackDate || new Date().toISOString()),
            category: template.feedback.categories?.length ? template.feedback.categories[0] : undefined,
            comment: template.feedback.comments?.length ? template.feedback.comments[0] : undefined
          };

          recentNegativeFeedback.push(entry);
        }
      }

      // Ordenar feedback negativo por data (mais recente primeiro)
      recentNegativeFeedback.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

      // Limitar a 10 entradas mais recentes
      const limitedNegativeFeedback = recentNegativeFeedback.slice(0, 10);

      return {
        totalFeedback,
        positiveFeedback,
        negativeFeedback,
        feedbackByCategory,
        recentNegativeFeedback: limitedNegativeFeedback
      };
    } catch (error) {
      this.logger.error(`[FEEDBACK_LEARNING] Erro ao analisar feedback: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * Identifica padrões de feedback negativo para melhorar os templates
   * @returns Lista de padrões identificados
   */
  async identifyFeedbackPatterns(): Promise<FeedbackPattern[]> {
    this.logger.log('[FEEDBACK_LEARNING] Identificando padrões de feedback');

    try {
      const analytics = await this.analyzeFeedback();
      const patterns: FeedbackPattern[] = [];

      // Analisar categorias com maior taxa de feedback negativo
      for (const [category, data] of Object.entries(analytics.feedbackByCategory)) {
        if (data.total < 5) continue; // Ignorar categorias com poucos feedbacks

        const negativePercentage = (data.negative / data.total) * 100;

        // Considerar apenas categorias com mais de 20% de feedback negativo
        if (negativePercentage > 20) {
          patterns.push({
            category,
            count: data.negative,
            percentage: negativePercentage
          });
        }
      }

      // Ordenar por percentual de feedback negativo (decrescente)
      patterns.sort((a, b) => b.percentage - a.percentage);

      return patterns;
    } catch (error) {
      this.logger.error(`[FEEDBACK_LEARNING] Erro ao identificar padrões: ${error instanceof Error ? error.message : String(error)}`);
      return [];
    }
  }

  /**
   * Identifica templates que precisam de revisão com base no feedback negativo
   * @param threshold Limite mínimo de feedback negativo para considerar revisão (padrão: 30%)
   * @returns Lista de templates que precisam de revisão
   */
  async identifyTemplatesForReview(threshold: number = 30): Promise<Template[]> {
    this.logger.log(`[FEEDBACK_LEARNING] Identificando templates para revisão (threshold: ${threshold}%)`);

    try {
      const templates = await this.semanticCacheService.listTemplates();
      const templatesForReview: Template[] = [];

      for (const template of templates) {
        const totalFeedback = template.feedback.positive + template.feedback.negative;

        // Considerar apenas templates com pelo menos 3 feedbacks
        if (totalFeedback >= 3) {
          const negativePercentage = (template.feedback.negative / totalFeedback) * 100;

          if (negativePercentage >= threshold || template.feedback.needsReview) {
            templatesForReview.push(template);
          }
        }
      }

      // Ordenar por percentual de feedback negativo (decrescente)
      templatesForReview.sort((a, b) => {
        const negativePercentageA = (a.feedback.negative / (a.feedback.positive + a.feedback.negative)) * 100;
        const negativePercentageB = (b.feedback.negative / (b.feedback.positive + b.feedback.negative)) * 100;
        return negativePercentageB - negativePercentageA;
      });

      return templatesForReview;
    } catch (error) {
      this.logger.error(`[FEEDBACK_LEARNING] Erro ao identificar templates para revisão: ${error instanceof Error ? error.message : String(error)}`);
      return [];
    }
  }

  /**
   * Gera relatório de aprendizado com base nos feedbacks
   * @returns Relatório com insights e recomendações
   */
  async generateLearningReport(): Promise<string> {
    this.logger.log('[FEEDBACK_LEARNING] Gerando relatório de aprendizado');

    try {
      const analytics = await this.analyzeFeedback();
      const patterns = await this.identifyFeedbackPatterns();
      const templatesForReview = await this.identifyTemplatesForReview();

      // Taxa de feedback positivo
      const positiveFeedbackRate = analytics.totalFeedback > 0
        ? (analytics.positiveFeedback / analytics.totalFeedback) * 100
        : 0;

      // Construir relatório
      let report = `# Relatório de Aprendizado de Feedback\n\n`;
      report += `## Estatísticas Gerais\n`;
      report += `- Total de feedbacks: ${analytics.totalFeedback}\n`;
      report += `- Feedbacks positivos: ${analytics.positiveFeedback} (${positiveFeedbackRate.toFixed(2)}%)\n`;
      report += `- Feedbacks negativos: ${analytics.negativeFeedback} (${(100 - positiveFeedbackRate).toFixed(2)}%)\n\n`;

      report += `## Padrões Identificados\n`;
      if (patterns.length > 0) {
        for (const pattern of patterns) {
          report += `- Categoria "${pattern.category}": ${pattern.count} feedbacks negativos (${pattern.percentage.toFixed(2)}%)\n`;
        }
      } else {
        report += `- Nenhum padrão significativo identificado\n`;
      }
      report += `\n`;

      report += `## Templates que Precisam de Revisão\n`;
      if (templatesForReview.length > 0) {
        report += `Total: ${templatesForReview.length} templates\n\n`;
        for (let i = 0; i < Math.min(5, templatesForReview.length); i++) {
          const template = templatesForReview[i];
          const negativePercentage = (template.feedback.negative / (template.feedback.positive + template.feedback.negative)) * 100;

          report += `### Template ${i + 1}\n`;
          report += `- Pergunta: "${template.question}"\n`;
          report += `- Feedback negativo: ${template.feedback.negative} (${negativePercentage.toFixed(2)}%)\n`;
          if (template.feedback.categories && template.feedback.categories.length > 0) {
            report += `- Categorias: ${template.feedback.categories.join(', ')}\n`;
          }
          if (template.feedback.comments && template.feedback.comments.length > 0) {
            report += `- Comentário recente: "${template.feedback.comments[0]}"\n`;
          }
          report += `\n`;
        }
      } else {
        report += `- Nenhum template identificado para revisão\n`;
      }

      return report;
    } catch (error) {
      this.logger.error(`[FEEDBACK_LEARNING] Erro ao gerar relatório: ${error instanceof Error ? error.message : String(error)}`);
      return `Erro ao gerar relatório: ${error instanceof Error ? error.message : String(error)}`;
    }
  }
}
