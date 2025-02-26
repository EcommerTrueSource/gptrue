import { registerAs } from '@nestjs/config';

export default registerAs('app.redis', () => ({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379', 10),
  password: process.env.REDIS_PASSWORD,
  ttl: parseInt(process.env.REDIS_TTL || '3600', 10), // 1 hora por padrão
  max: parseInt(process.env.REDIS_MAX_ITEMS || '100', 10), // máximo de itens em cache
  bull: {
    defaultJobOptions: {
      attempts: parseInt(process.env.BULL_JOB_ATTEMPTS || '3', 10),
      backoff: {
        type: 'exponential',
        delay: parseInt(process.env.BULL_BACKOFF_DELAY || '1000', 10),
      },
      timeout: parseInt(process.env.BULL_JOB_TIMEOUT || '30000', 10), // 30 segundos
      removeOnComplete: process.env.BULL_REMOVE_ON_COMPLETE === 'true',
      removeOnFail: process.env.BULL_REMOVE_ON_FAIL === 'true',
    },
    limiter: {
      max: parseInt(process.env.BULL_RATE_LIMIT_MAX || '100', 10), // máximo de jobs por intervalo
      duration: parseInt(process.env.BULL_RATE_LIMIT_DURATION || '60000', 10), // intervalo em ms (1 minuto)
    },
  },
}));
