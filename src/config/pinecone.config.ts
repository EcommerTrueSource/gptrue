import { registerAs } from '@nestjs/config';

export default registerAs('pinecone', () => ({
  apiKey: process.env.PINECONE_API_KEY || '',
  environment: process.env.PINECONE_ENVIRONMENT || '',
  indexName: process.env.PINECONE_INDEX || 'gptrue-index',
  namespace: process.env.PINECONE_NAMESPACE || 'default',
  dimension: 1536, // OpenAI ada-002 embedding dimension
  similarityThreshold: parseFloat(process.env.PINECONE_SIMILARITY_THRESHOLD) || 0.85,
  ttl: {
    enabled: process.env.PINECONE_TTL_ENABLED === 'true',
    days: parseInt(process.env.PINECONE_TTL_DAYS, 10) || 30,
  },
})); 