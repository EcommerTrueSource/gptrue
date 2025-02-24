import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MetricType, Metrics, AlertThresholds } from './interfaces/monitoring.interface';

@Injectable()
export class MonitoringService {
  private readonly logger = new Logger(MonitoringService.name);
  private metrics: Metrics = {
    responseTime: {
      total: [],
      byComponent: {},
    },
    cacheHitRate: {
      semantic: { hits: 0, misses: 0 },
      redis: { hits: 0, misses: 0 },
    },
    sqlGeneration: {
      success: 0,
      failure: 0,
    },
    feedback: {
      positive: 0,
      negative: 0,
    },
    apiCosts: {
      vertexAI: 0,
      openAI: 0,
    },
    errors: [],
  };

  private readonly alertThresholds: AlertThresholds = {
    responseTime: 5000, // 5 segundos
    cacheHitRate: 0.5, // 50%
    sqlGenerationFailureRate: 0.2, // 20%
    negativeFeedbackRate: 0.3, // 30%
    errorRate: 0.1, // 10%
  };

  constructor(private configService: ConfigService) {
    // Inicializar com valores da configuração, se disponíveis
    const configThresholds = this.configService.get<AlertThresholds>('monitoring.alertThresholds');
    if (configThresholds) {
      this.alertThresholds = { ...this.alertThresholds, ...configThresholds };
    }
  }

  /**
   * Registra o tempo de resposta
   * @param component Componente que gerou a métrica
   * @param timeMs Tempo em milissegundos
   */
  recordResponseTime(component: string, timeMs: number): void {
    try {
      // Registrar tempo total
      this.metrics.responseTime.total.push(timeMs);
      
      // Manter apenas os últimos 1000 registros
      if (this.metrics.responseTime.total.length > 1000) {
        this.metrics.responseTime.total.shift();
      }
      
      // Registrar por componente
      if (!this.metrics.responseTime.byComponent[component]) {
        this.metrics.responseTime.byComponent[component] = [];
      }
      
      this.metrics.responseTime.byComponent[component].push(timeMs);
      
      // Manter apenas os últimos 1000 registros por componente
      if (this.metrics.responseTime.byComponent[component].length > 1000) {
        this.metrics.responseTime.byComponent[component].shift();
      }
      
      // Verificar alerta
      if (timeMs > this.alertThresholds.responseTime) {
        this.logger.warn(`Tempo de resposta alto (${timeMs}ms) no componente ${component}`);
      }
    } catch (error) {
      this.logger.error(`Erro ao registrar tempo de resposta: ${error.message}`, error.stack);
    }
  }

  /**
   * Registra hit/miss de cache
   * @param type Tipo de cache (semantic ou redis)
   * @param hit Verdadeiro se foi hit, falso se foi miss
   */
  recordCacheAccess(type: 'semantic' | 'redis', hit: boolean): void {
    try {
      if (hit) {
        this.metrics.cacheHitRate[type].hits++;
      } else {
        this.metrics.cacheHitRate[type].misses++;
      }
      
      // Verificar alerta
      const totalAccesses = this.metrics.cacheHitRate[type].hits + this.metrics.cacheHitRate[type].misses;
      if (totalAccesses > 100) {
        const hitRate = this.metrics.cacheHitRate[type].hits / totalAccesses;
        if (hitRate < this.alertThresholds.cacheHitRate) {
          this.logger.warn(`Taxa de acerto de cache ${type} baixa: ${(hitRate * 100).toFixed(2)}%`);
        }
      }
    } catch (error) {
      this.logger.error(`Erro ao registrar acesso ao cache: ${error.message}`, error.stack);
    }
  }

  /**
   * Registra sucesso/falha na geração de SQL
   * @param success Verdadeiro se foi sucesso, falso se foi falha
   */
  recordSqlGeneration(success: boolean): void {
    try {
      if (success) {
        this.metrics.sqlGeneration.success++;
      } else {
        this.metrics.sqlGeneration.failure++;
      }
      
      // Verificar alerta
      const total = this.metrics.sqlGeneration.success + this.metrics.sqlGeneration.failure;
      if (total > 50) {
        const failureRate = this.metrics.sqlGeneration.failure / total;
        if (failureRate > this.alertThresholds.sqlGenerationFailureRate) {
          this.logger.warn(`Taxa de falha na geração de SQL alta: ${(failureRate * 100).toFixed(2)}%`);
        }
      }
    } catch (error) {
      this.logger.error(`Erro ao registrar geração de SQL: ${error.message}`, error.stack);
    }
  }

  /**
   * Registra feedback do usuário
   * @param positive Verdadeiro se foi positivo, falso se foi negativo
   */
  recordFeedback(positive: boolean): void {
    try {
      if (positive) {
        this.metrics.feedback.positive++;
      } else {
        this.metrics.feedback.negative++;
      }
      
      // Verificar alerta
      const total = this.metrics.feedback.positive + this.metrics.feedback.negative;
      if (total > 50) {
        const negativeRate = this.metrics.feedback.negative / total;
        if (negativeRate > this.alertThresholds.negativeFeedbackRate) {
          this.logger.warn(`Taxa de feedback negativo alta: ${(negativeRate * 100).toFixed(2)}%`);
        }
      }
    } catch (error) {
      this.logger.error(`Erro ao registrar feedback: ${error.message}`, error.stack);
    }
  }

  /**
   * Registra custo de API
   * @param api API utilizada (vertexAI ou openAI)
   * @param cost Custo estimado
   */
  recordApiCost(api: 'vertexAI' | 'openAI', cost: number): void {
    try {
      this.metrics.apiCosts[api] += cost;
    } catch (error) {
      this.logger.error(`Erro ao registrar custo de API: ${error.message}`, error.stack);
    }
  }

  /**
   * Registra um erro
   * @param component Componente que gerou o erro
   * @param error Erro ocorrido
   */
  recordError(component: string, error: Error): void {
    try {
      this.metrics.errors.push({
        component,
        message: error.message,
        stack: error.stack,
        timestamp: new Date(),
      });
      
      // Manter apenas os últimos 100 erros
      if (this.metrics.errors.length > 100) {
        this.metrics.errors.shift();
      }
      
      // Verificar alerta
      const recentErrors = this.metrics.errors.filter(
        e => e.timestamp > new Date(Date.now() - 3600000) // Última hora
      );
      
      if (recentErrors.length > 10) {
        this.logger.warn(`Alta taxa de erros na última hora: ${recentErrors.length} erros`);
      }
    } catch (error) {
      this.logger.error(`Erro ao registrar erro: ${error.message}`, error.stack);
    }
  }

  /**
   * Obtém todas as métricas
   * @returns Métricas coletadas
   */
  getMetrics(): Metrics {
    return this.metrics;
  }

  /**
   * Obtém métricas agregadas
   * @returns Métricas agregadas
   */
  getAggregatedMetrics(): any {
    try {
      // Calcular tempo médio de resposta
      const avgResponseTime = this.metrics.responseTime.total.length > 0
        ? this.metrics.responseTime.total.reduce((sum, time) => sum + time, 0) / this.metrics.responseTime.total.length
        : 0;
      
      // Calcular taxa de acerto de cache
      const semanticCacheHitRate = this.getTotalCacheHitRate('semantic');
      const redisCacheHitRate = this.getTotalCacheHitRate('redis');
      
      // Calcular taxa de sucesso na geração de SQL
      const sqlGenerationSuccessRate = this.getSqlGenerationSuccessRate();
      
      // Calcular taxa de feedback positivo
      const positiveFeedbackRate = this.getPositiveFeedbackRate();
      
      // Calcular custos totais de API
      const totalApiCosts = this.metrics.apiCosts.vertexAI + this.metrics.apiCosts.openAI;
      
      return {
        avgResponseTime,
        semanticCacheHitRate,
        redisCacheHitRate,
        sqlGenerationSuccessRate,
        positiveFeedbackRate,
        totalApiCosts,
        errorCount: this.metrics.errors.length,
        recentErrorCount: this.metrics.errors.filter(
          e => e.timestamp > new Date(Date.now() - 3600000) // Última hora
        ).length,
      };
    } catch (error) {
      this.logger.error(`Erro ao calcular métricas agregadas: ${error.message}`, error.stack);
      return {};
    }
  }

  /**
   * Obtém a taxa de acerto de cache
   * @param type Tipo de cache
   * @returns Taxa de acerto
   */
  private getTotalCacheHitRate(type: 'semantic' | 'redis'): number {
    const { hits, misses } = this.metrics.cacheHitRate[type];
    const total = hits + misses;
    return total > 0 ? hits / total : 0;
  }

  /**
   * Obtém a taxa de sucesso na geração de SQL
   * @returns Taxa de sucesso
   */
  private getSqlGenerationSuccessRate(): number {
    const { success, failure } = this.metrics.sqlGeneration;
    const total = success + failure;
    return total > 0 ? success / total : 0;
  }

  /**
   * Obtém a taxa de feedback positivo
   * @returns Taxa de feedback positivo
   */
  private getPositiveFeedbackRate(): number {
    const { positive, negative } = this.metrics.feedback;
    const total = positive + negative;
    return total > 0 ? positive / total : 0;
  }

  /**
   * Reseta todas as métricas
   */
  resetMetrics(): void {
    this.metrics = {
      responseTime: {
        total: [],
        byComponent: {},
      },
      cacheHitRate: {
        semantic: { hits: 0, misses: 0 },
        redis: { hits: 0, misses: 0 },
      },
      sqlGeneration: {
        success: 0,
        failure: 0,
      },
      feedback: {
        positive: 0,
        negative: 0,
      },
      apiCosts: {
        vertexAI: 0,
        openAI: 0,
      },
      errors: [],
    };
  }
} 