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
    this.memoryMonitoringInterval = setInterval(() => {
      const memoryUsage = process.memoryUsage();

      this.prometheusService.recordMemoryUsage('heapTotal', memoryUsage.heapTotal);
      this.prometheusService.recordMemoryUsage('heapUsed', memoryUsage.heapUsed);
      this.prometheusService.recordMemoryUsage('rss', memoryUsage.rss);
      this.prometheusService.recordMemoryUsage('external', memoryUsage.external);

      const heapUsagePercent = (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100;
      if (heapUsagePercent > 80) {
        this.logger.warn(`Alto uso de memória heap: ${heapUsagePercent.toFixed(2)}%`);
      }
    }, 30000);
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
