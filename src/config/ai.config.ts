import { registerAs } from '@nestjs/config';

export default registerAs('ai', () => ({
  openai: {
    apiKey: process.env.OPENAI_API_KEY || '',
    model: process.env.OPENAI_MODEL || 'gpt-4',
    maxTokens: parseInt(process.env.OPENAI_MAX_TOKENS, 10) || 2000,
    temperature: parseFloat(process.env.OPENAI_TEMPERATURE) || 0.7,
    embeddingModel: 'text-embedding-ada-002',
  },
  vertexAi: {
    projectId: process.env.GOOGLE_CLOUD_PROJECT_ID || '',
    location: process.env.VERTEX_AI_LOCATION || 'us-central1',
    model: process.env.VERTEX_AI_MODEL || 'text-bison@002',
    maxTokens: parseInt(process.env.VERTEX_AI_MAX_TOKENS, 10) || 1024,
    temperature: parseFloat(process.env.VERTEX_AI_TEMPERATURE) || 0.2,
  },
  langchain: {
    verbose: process.env.LANGCHAIN_VERBOSE === 'true',
    maxRetries: parseInt(process.env.LANGCHAIN_MAX_RETRIES, 10) || 3,
    timeout: parseInt(process.env.LANGCHAIN_TIMEOUT_MS, 10) || 30000,
  },
})); 