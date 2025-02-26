export default () => ({
  app: {
    port: parseInt(process.env.PORT, 10) || 3000,
    environment: process.env.NODE_ENV || 'development',
    logging: {
      level: process.env.LOG_LEVEL || 'info',
    },
    cors: {
      origin: process.env.CORS_ORIGIN || '*',
    },
    metrics: {
      enabled: process.env.ENABLE_METRICS === 'true',
      port: parseInt(process.env.METRICS_PORT, 10) || 9090,
    },
    timeouts: {
      request: parseInt(process.env.REQUEST_TIMEOUT, 10) || 30000,
      query: parseInt(process.env.QUERY_TIMEOUT, 10) || 60000,
    },
  },
  clerk: {
    publishableKey: process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
    secretKey: process.env.CLERK_SECRET_KEY,
  },
  bigquery: {
    projectId: process.env.BIGQUERY_PROJECT_ID,
    dataset: process.env.BIGQUERY_DATASET,
    location: process.env.BIGQUERY_LOCATION || 'US',
    maxBytesProcessed: parseInt(process.env.BIGQUERY_MAX_BYTES_PROCESSED, 10) || 1000000000,
    timeoutMs: parseInt(process.env.BIGQUERY_TIMEOUT_MS, 10) || 30000,
  },
  pinecone: {
    apiKey: process.env.PINECONE_API_KEY,
    environment: process.env.PINECONE_ENVIRONMENT,
    index: process.env.PINECONE_INDEX,
    host: process.env.PINECONE_HOST,
    namespace: process.env.PINECONE_NAMESPACE || 'default',
    similarityThreshold: parseFloat(process.env.PINECONE_SIMILARITY_THRESHOLD) || 0.85,
    ttl: {
      enabled: process.env.PINECONE_TTL_ENABLED === 'true',
      days: parseInt(process.env.PINECONE_TTL_DAYS, 10) || 30,
    },
  },
  ai: {
    openai: {
      apiKey: process.env.OPENAI_API_KEY,
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      maxTokens: parseInt(process.env.OPENAI_MAX_TOKENS, 10) || 2000,
      temperature: parseFloat(process.env.OPENAI_TEMPERATURE) || 0.7,
    },
    vertexAi: {
      projectId: process.env.VERTEX_AI_PROJECT_ID,
      location: process.env.VERTEX_AI_LOCATION || 'us-central1',
      model: process.env.VERTEX_AI_MODEL || 'text-bison@001',
      maxTokens: parseInt(process.env.VERTEX_AI_MAX_TOKENS, 10) || 1024,
      temperature: parseFloat(process.env.VERTEX_AI_TEMPERATURE) || 0.2,
    },
  },
  langchain: {
    verbose: process.env.LANGCHAIN_VERBOSE === 'true',
    maxRetries: parseInt(process.env.LANGCHAIN_MAX_RETRIES, 10) || 3,
    timeoutMs: parseInt(process.env.LANGCHAIN_TIMEOUT_MS, 10) || 30000,
  },
  rateLimiting: {
    enabled: process.env.ENABLE_RATE_LIMITING === 'true',
    points: parseInt(process.env.RATE_LIMIT_POINTS, 10) || 100,
    duration: parseInt(process.env.RATE_LIMIT_DURATION, 10) || 60,
  },
  cache: {
    ttl: parseInt(process.env.CACHE_TTL, 10) || 3600,
    maxSize: parseInt(process.env.MAX_CACHE_SIZE, 10) || 1000,
  },
  redis: {
    url: process.env.REDIS_URL,
    host: process.env.REDIS_HOST,
    port: parseInt(process.env.REDIS_PORT, 10) || 24927,
    username: process.env.REDIS_USERNAME || 'default',
    password: process.env.REDIS_PASSWORD,
    tls: process.env.REDIS_TLS === 'true',
  },
  security: {
    enableRateLimiting: process.env.ENABLE_RATE_LIMITING === 'true',
    enableRequestValidation: process.env.ENABLE_REQUEST_VALIDATION === 'true',
    enableSqlValidation: process.env.ENABLE_SQL_VALIDATION === 'true',
  },
});
