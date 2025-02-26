import { registerAs } from '@nestjs/config';

export default registerAs('app', () => ({
  port: parseInt(process.env.PORT ?? '3000', 10),
  logLevel: process.env.LOG_LEVEL ?? 'debug',
  frontendUrl: process.env.FRONTEND_URL ?? 'http://localhost:3000',
  corsOrigin: process.env.CORS_ORIGIN ?? 'http://localhost:3000',
  enableMetrics: process.env.ENABLE_METRICS === 'true',
  metricsPort: parseInt(process.env.METRICS_PORT ?? '9090', 10),
  requestTimeout: parseInt(process.env.REQUEST_TIMEOUT ?? '30000', 10),
  maxConcurrentQueries: parseInt(process.env.MAX_CONCURRENT_QUERIES ?? '10', 10),
  enableRateLimiting: process.env.ENABLE_RATE_LIMITING === 'true',
  enableRequestValidation: process.env.ENABLE_REQUEST_VALIDATION === 'true',
  enableSqlValidation: process.env.ENABLE_SQL_VALIDATION === 'true',
  environment: process.env.NODE_ENV || 'development',
  apiPrefix: process.env.API_PREFIX || 'api',
  logging: {
    level: process.env.LOG_LEVEL || 'info',
  },
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT ?? '6379', 10) || 6379,
    password: process.env.REDIS_PASSWORD || undefined,
    ttl: parseInt(process.env.REDIS_TTL ?? '3600', 10) || 3600,
    max: parseInt(process.env.REDIS_MAX_ITEMS ?? '100', 10) || 100,
  },
}));
