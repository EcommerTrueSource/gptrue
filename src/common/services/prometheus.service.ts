import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Counter, Gauge, Histogram } from 'prom-client';
import { register, collectDefaultMetrics } from 'prom-client';
import { prometheusConfig, clearRegistry } from '../../config/prometheus.config';

@Injectable()
export class PrometheusService implements OnModuleInit, OnModuleDestroy {
  private readonly resourceUsageGauge: Gauge<string>;
  private readonly apiRequestsCounter: Counter<string>;
  private readonly apiLatencyHistogram: Histogram<string>;
  private readonly errorCounter: Counter<string>;
  private readonly queryDurationHistogram: Histogram<string>;
  private readonly memoryUsageGauge: Gauge<string>;
  private readonly activeConnectionsGauge: Gauge<string>;

  constructor(private readonly configService: ConfigService) {
    const prefix = this.configService.get('PROMETHEUS_PREFIX') || prometheusConfig.prefix;

    // Gauge para uso de recursos
    this.resourceUsageGauge = new Gauge({
      name: `${prefix}resource_usage`,
      help: 'Uso atual de recursos por tipo',
      labelNames: ['resource', 'service']
    });

    // Counter para requisições da API
    this.apiRequestsCounter = new Counter({
      name: `${prefix}api_requests_total`,
      help: 'Total de requisições da API por endpoint e status',
      labelNames: ['endpoint', 'method', 'status']
    });

    // Histogram para latência da API
    this.apiLatencyHistogram = new Histogram({
      name: `${prefix}api_latency_seconds`,
      help: 'Latência das requisições da API',
      labelNames: ['endpoint', 'method'],
      buckets: prometheusConfig.buckets.api
    });

    // Counter para erros
    this.errorCounter = new Counter({
      name: `${prefix}errors_total`,
      help: 'Total de erros por serviço e tipo',
      labelNames: ['service', 'type']
    });

    // Histogram para duração de queries
    this.queryDurationHistogram = new Histogram({
      name: `${prefix}query_duration_seconds`,
      help: 'Duração das queries por tipo',
      labelNames: ['type', 'service'],
      buckets: prometheusConfig.buckets.query
    });

    // Gauge para uso de memória
    this.memoryUsageGauge = new Gauge({
      name: `${prefix}memory_usage_bytes`,
      help: 'Uso de memória por tipo',
      labelNames: ['type']
    });

    // Gauge para conexões ativas
    this.activeConnectionsGauge = new Gauge({
      name: `${prefix}active_connections`,
      help: 'Número de conexões ativas por serviço',
      labelNames: ['service']
    });
  }

  onModuleInit() {
    // Configurar métricas padrão se habilitadas
    if (this.configService.get('PROMETHEUS_DEFAULT_METRICS')) {
      collectDefaultMetrics({
        prefix: prometheusConfig.defaultMetrics.config.prefix,
        labels: prometheusConfig.defaultMetrics.config.labels
      });
    }
  }

  onModuleDestroy() {
    clearRegistry();
  }

  // Registrar uso de recursos
  recordResourceUsage(resource: string, value: number, service: string = 'default') {
    this.resourceUsageGauge.labels(resource, service).set(value);
  }

  // Registrar métricas da API
  recordAPIMetrics(endpoint: string, method: string, statusCode: number, duration: number) {
    this.apiRequestsCounter.labels(endpoint, method, statusCode.toString()).inc();
    this.apiLatencyHistogram.labels(endpoint, method).observe(duration);
  }

  // Registrar erros
  recordError(service: string, type: string = 'unknown') {
    this.errorCounter.labels(service, type).inc();
  }

  // Registrar duração de query
  recordQueryDuration(type: string, duration: number, service: string = 'default') {
    this.queryDurationHistogram.labels(type, service).observe(duration);
  }

  // Registrar uso de memória
  recordMemoryUsage(type: string, bytes: number) {
    this.memoryUsageGauge.labels(type).set(bytes);
  }

  // Registrar conexões ativas
  recordActiveConnections(service: string, count: number) {
    this.activeConnectionsGauge.labels(service).set(count);
  }

  // Obter todas as métricas registradas
  async getMetrics(): Promise<string> {
    return register.metrics();
  }
}
