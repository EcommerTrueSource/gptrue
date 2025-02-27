import * as Joi from 'joi';
import { register } from 'prom-client';

// Configuração padrão do Prometheus
export const prometheusConfig = {
  prefix: 'gptrue_',
  defaultLabels: {
    app: 'gptrue',
    environment: process.env.NODE_ENV || 'development'
  },
  defaultMetrics: {
    enabled: true,
    config: {
      prefix: 'gptrue_process_',
      labels: {
        app: 'gptrue'
      }
    }
  },
  buckets: {
    api: [0.1, 0.3, 0.5, 0.7, 1, 3, 5, 7, 10],
    query: [0.5, 1, 2.5, 5, 10, 25, 50, 100],
    memory: [50 * 1024 * 1024, 100 * 1024 * 1024, 250 * 1024 * 1024, 500 * 1024 * 1024]
  }
};

// Schema de validação
export const prometheusValidationSchema = Joi.object({
  PROMETHEUS_ENABLED: Joi.boolean()
    .default(true)
    .description('Habilita ou desabilita a coleta de métricas do Prometheus'),

  PROMETHEUS_PATH: Joi.string()
    .default('/metrics')
    .pattern(/^\/[a-zA-Z0-9-_/]*$/)
    .description('Caminho para endpoint de métricas do Prometheus'),

  PROMETHEUS_PREFIX: Joi.string()
    .default('gptrue_')
    .pattern(/^[a-z][a-z0-9_]*$/)
    .description('Prefixo para todas as métricas do Prometheus'),

  PROMETHEUS_DEFAULT_METRICS: Joi.boolean()
    .default(true)
    .description('Habilita ou desabilita métricas padrão do processo'),

  PROMETHEUS_COLLECT_INTERVAL: Joi.number()
    .min(1000)
    .max(300000)
    .default(10000)
    .description('Intervalo de coleta de métricas em ms')
});

// Interface de configuração
export interface PrometheusConfig {
  enabled: boolean;
  path: string;
  prefix: string;
  defaultMetrics: boolean;
  collectInterval: number;
}

// Limpar registro ao reiniciar
export const clearRegistry = () => {
  register.clear();
};
