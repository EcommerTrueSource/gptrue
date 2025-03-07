import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrometheusService } from '../../common/services/prometheus.service';

@Injectable()
export class ConfigMonitoringService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ConfigMonitoringService.name);
  private readonly usageMetrics: Map<string, number> = new Map();
  private readonly resourceLimits: Map<string, number> = new Map();
  private readonly startTime: number = Date.now();
  private memoryMonitoringInterval: NodeJS.Timeout;
  private reportInterval: NodeJS.Timeout;

  constructor(
    private readonly configService: ConfigService,
    private readonly prometheusService: PrometheusService
  ) {
    this.initializeResourceLimits();
  }

  onModuleInit() {
    this.startMemoryMonitoring();
    this.startReportGeneration();
  }

  onModuleDestroy() {
    if (this.memoryMonitoringInterval) {
      clearInterval(this.memoryMonitoringInterval);
    }
    if (this.reportInterval) {
      clearInterval(this.reportInterval);
    }
  }

  private initializeResourceLimits() {
    // BigQuery
    this.resourceLimits.set('bigquery.maxBytesProcessed',
      this.configService.get<number>('BIGQUERY_MAX_BYTES_PROCESSED'));
    this.resourceLimits.set('bigquery.maxResults',
      this.configService.get<number>('MAX_QUERY_RESULTS'));
    this.resourceLimits.set('bigquery.maxConcurrentQueries',
      this.configService.get<number>('MAX_CONCURRENT_QUERIES'));

    // OpenAI
    this.resourceLimits.set('openai.maxTokens',
      this.configService.get<number>('OPENAI_MAX_TOKENS'));
    this.resourceLimits.set('openai.maxRequestsPerMinute',
      this.configService.get<number>('OPENAI_MAX_REQUESTS_PER_MINUTE'));

    // Vertex AI
    this.resourceLimits.set('vertexai.maxTokens',
      this.configService.get<number>('VERTEX_AI_MAX_TOKENS'));
    this.resourceLimits.set('vertexai.maxRequestsPerMinute',
      this.configService.get<number>('VERTEX_AI_MAX_REQUESTS_PER_MINUTE'));

    // Redis
    this.resourceLimits.set('redis.maxItems',
      this.configService.get<number>('REDIS_MAX_ITEMS'));
    this.resourceLimits.set('redis.maxMemoryMB',
      this.configService.get<number>('REDIS_MAX_MEMORY_MB'));

    // Rate Limiting
    this.resourceLimits.set('rateLimit.points',
      this.configService.get<number>('RATE_LIMIT_POINTS'));
    this.resourceLimits.set('rateLimit.duration',
      this.configService.get<number>('RATE_LIMIT_DURATION'));
  }

  private startMemoryMonitoring() {
    const intervalMs = this.configService.get<number>('app.monitoring.memoryCheckIntervalMs') || 60000;
    const warningThreshold = this.configService.get<number>('app.monitoring.memoryWarningThresholdPercent') || 95;
    const criticalThreshold = this.configService.get<number>('app.monitoring.memoryCriticalThresholdPercent') || 98;

    this.logger.log(`Iniciando monitoramento de memória a cada ${intervalMs}ms com limite de alerta em ${warningThreshold}%`);

    // Armazenar snapshots para detectar vazamentos
    const memorySnapshots: { timestamp: Date; heapUsed: number }[] = [];
    const MAX_SNAPSHOTS = 20;

    this.memoryMonitoringInterval = setInterval(() => {
      const memoryUsage = process.memoryUsage();

      // Registrar métricas no Prometheus
      this.prometheusService.recordMemoryUsage('heapTotal', memoryUsage.heapTotal);
      this.prometheusService.recordMemoryUsage('heapUsed', memoryUsage.heapUsed);
      this.prometheusService.recordMemoryUsage('rss', memoryUsage.rss);
      this.prometheusService.recordMemoryUsage('external', memoryUsage.external);

      // Calcular porcentagem de uso
      const heapUsagePercent = (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100;

      // Adicionar snapshot para análise de tendência
      memorySnapshots.push({
        timestamp: new Date(),
        heapUsed: memoryUsage.heapUsed
      });

      // Manter apenas os últimos MAX_SNAPSHOTS
      if (memorySnapshots.length > MAX_SNAPSHOTS) {
        memorySnapshots.shift();
      }

      // Verificar tendência de crescimento
      let isGrowing = false;
      if (memorySnapshots.length >= 5) {
        const recentSnapshots = memorySnapshots.slice(-5);
        let growingCount = 0;

        for (let i = 1; i < recentSnapshots.length; i++) {
          if (recentSnapshots[i].heapUsed > recentSnapshots[i-1].heapUsed) {
            growingCount++;
          }
        }

        // Só considerar crescente se 4 de 5 snapshots mostrarem crescimento
        isGrowing = growingCount >= 4;
      }

      // Registrar uso de memória em nível de debug
      this.logger.debug(`Uso de memória: ${heapUsagePercent.toFixed(2)}% (${this.formatBytes(memoryUsage.heapUsed)}/${this.formatBytes(memoryUsage.heapTotal)})`);

      // Alertar se estiver acima do limite de aviso E estiver crescendo
      if (heapUsagePercent > warningThreshold && isGrowing) {
        this.logger.warn(`Alto uso de memória heap: ${heapUsagePercent.toFixed(2)}% (CRESCENTE)`);
        this.logDetailedMemoryInfo(memoryUsage, memorySnapshots);
      }

      // Ações adicionais se estiver acima do limite crítico
      if (heapUsagePercent > criticalThreshold) {
        this.logger.error(`USO CRÍTICO de memória heap: ${heapUsagePercent.toFixed(2)}%`);
        this.logDetailedMemoryInfo(memoryUsage, memorySnapshots);

        // Sugerir coleta de lixo em ambiente de desenvolvimento
        if (process.env.NODE_ENV === 'development' && global.gc) {
          this.logger.warn('Forçando coleta de lixo devido ao alto uso de memória');
          try {
            global.gc();
          } catch (error) {
            this.logger.error('Erro ao forçar coleta de lixo:', error);
          }
        }
      }
    }, intervalMs);
  }

  /**
   * Registra informações detalhadas sobre o uso de memória
   */
  private logDetailedMemoryInfo(memoryUsage: NodeJS.MemoryUsage, snapshots: { timestamp: Date; heapUsed: number }[]) {
    this.logger.warn('Detalhes de uso de memória:', {
      heapTotal: this.formatBytes(memoryUsage.heapTotal),
      heapUsed: this.formatBytes(memoryUsage.heapUsed),
      rss: this.formatBytes(memoryUsage.rss),
      external: this.formatBytes(memoryUsage.external),
      arrayBuffers: this.formatBytes(memoryUsage.arrayBuffers || 0),
    });

    // Registrar tendência de crescimento
    if (snapshots.length >= 10) {
      const first = snapshots[0];
      const last = snapshots[snapshots.length - 1];
      const growthBytes = last.heapUsed - first.heapUsed;
      const timeSpanMs = last.timestamp.getTime() - first.timestamp.getTime();
      const growthRate = (growthBytes / timeSpanMs) * 1000; // bytes por segundo

      this.logger.warn(`Taxa de crescimento de memória: ${this.formatBytes(growthRate)}/segundo`);
    }
  }

  private startReportGeneration() {
    this.reportInterval = setInterval(async () => {
      try {
        await this.generateUsageReport();
      } catch (error) {
        this.logger.error('Erro ao gerar relatório de uso:', error);
        this.prometheusService.recordError('config-monitoring', 'report-generation');
      }
    }, 3600000);
  }

  trackResourceUsage(resource: string, usage: number, service: string = 'default') {
    const currentUsage = this.usageMetrics.get(resource) || 0;
    this.usageMetrics.set(resource, currentUsage + usage);

    this.prometheusService.recordResourceUsage(resource, usage, service);

    const limit = this.resourceLimits.get(resource);
    if (limit && (currentUsage + usage) > limit * 0.8) {
      this.logger.warn(`Alto uso de recurso detectado: ${resource} (${currentUsage + usage}/${limit})`);
      this.checkCriticalUsage(resource, currentUsage + usage);
    }
  }

  trackOpenAIUsage(tokens: number, model: string) {
    this.trackResourceUsage('openai.tokens', tokens, model);
    this.prometheusService.recordQueryDuration('openai', Date.now() - this.startTime, model);
  }

  trackBigQueryUsage(bytes: number, queryType: string) {
    this.trackResourceUsage('bigquery.bytes', bytes, queryType);
    this.prometheusService.recordQueryDuration('bigquery', Date.now() - this.startTime, queryType);
  }

  trackRedisUsage(items: number, operation: string) {
    this.trackResourceUsage('redis.items', items, operation);
    this.prometheusService.recordActiveConnections('redis', items);
  }

  trackAPIRequest(endpoint: string, method: string, statusCode: number, startTime: number) {
    const duration = (Date.now() - startTime) / 1000;
    this.prometheusService.recordAPIMetrics(endpoint, method, statusCode, duration);
  }

  trackError(service: string, error: Error) {
    this.logger.error(`Erro em ${service}: ${error.message}`, error.stack);
    this.prometheusService.recordError(service, error.name);
  }

  async generateUsageReport() {
    const memoryUsage = process.memoryUsage();
    const timestamp = new Date().toISOString();

    const report = {
      timestamp,
      memory: {
        heapTotal: this.formatBytes(memoryUsage.heapTotal),
        heapUsed: this.formatBytes(memoryUsage.heapUsed),
        rss: this.formatBytes(memoryUsage.rss),
        external: this.formatBytes(memoryUsage.external),
      },
      uptime: process.uptime(),
      environment: this.configService.get('NODE_ENV'),
    };

    this.logger.log(`Relatório de uso gerado: ${JSON.stringify(report, null, 2)}`);
    return report;
  }

  private formatBytes(bytes: number): string {
    const units = ['B', 'KB', 'MB', 'GB'];
    let value = bytes;
    let unitIndex = 0;

    while (value >= 1024 && unitIndex < units.length - 1) {
      value /= 1024;
      unitIndex++;
    }

    return `${value.toFixed(2)} ${units[unitIndex]}`;
  }

  private checkCriticalUsage(resource: string, usage: number) {
    const limit = this.resourceLimits.get(resource);
    if (limit && usage > limit * 0.95) {
      this.logger.error(
        `USO CRÍTICO de recurso detectado: ${resource} (${usage}/${limit})`
      );
    }
  }
}
