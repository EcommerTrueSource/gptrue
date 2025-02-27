import { registerAs } from '@nestjs/config';
import * as Joi from 'joi';

// Regex para validação do formato da private key
const privateKeyRegex = /^-----BEGIN PRIVATE KEY-----\n[\s\S]*\n-----END PRIVATE KEY-----\n$/;

// Regex para validação do email de service account
const serviceAccountEmailRegex = /^[a-z0-9-]+@[a-z0-9-]+\.iam\.gserviceaccount\.com$/;

// Regex para validação do ID do projeto
const projectIdRegex = /^[a-z][a-z0-9-]{4,28}[a-z0-9]$/;

export const bigQueryConfigValidationSchema = Joi.object({
  BIGQUERY_ENABLED: Joi.boolean()
    .default(true)
    .description('Habilitar integração com BigQuery'),

  BIGQUERY_PROJECT_ID: Joi.string()
    .pattern(projectIdRegex)
    .required()
    .description('ID do projeto no Google Cloud'),

  BIGQUERY_DATASET: Joi.string()
    .pattern(/^[a-zA-Z0-9_]{1,1024}$/)
    .required()
    .description('Nome do dataset no BigQuery'),

  BIGQUERY_LOCATION: Joi.string()
    .valid('US', 'EU', 'asia-northeast1', 'europe-west2', 'us-central1')
    .default('US')
    .description('Localização do dataset'),

  BIGQUERY_MAX_BYTES_PROCESSED: Joi.number()
    .min(1000000)        // 1MB
    .max(10000000000)    // 10GB
    .default(1000000000) // 1GB
    .description('Máximo de bytes processados por query'),

  BIGQUERY_TIMEOUT_MS: Joi.number()
    .min(1000)
    .max(600000)
    .default(30000)
    .description('Timeout para queries BigQuery (ms)'),

  GOOGLE_CLOUD_CLIENT_EMAIL: Joi.string()
    .pattern(serviceAccountEmailRegex)
    .required()
    .description('Email da service account'),

  GOOGLE_CLOUD_PRIVATE_KEY: Joi.string()
    .pattern(privateKeyRegex)
    .required()
    .description('Chave privada da service account'),
});

export default registerAs('bigquery', () => {
  const credentials = {
    projectId: process.env.GOOGLE_CLOUD_PROJECT_ID,
    credentials: {
      client_email: process.env.GOOGLE_CLOUD_CLIENT_EMAIL,
      private_key: process.env.GOOGLE_CLOUD_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }
  };

  console.log('Configuração do BigQuery:', {
    enabled: process.env.BIGQUERY_ENABLED !== 'false',
    projectId: process.env.BIGQUERY_PROJECT_ID,
    dataset: process.env.BIGQUERY_DATASET,
    location: process.env.BIGQUERY_LOCATION,
  });

  return {
    enabled: process.env.BIGQUERY_ENABLED !== 'false',
    projectId: process.env.BIGQUERY_PROJECT_ID || 'truebrands-warehouse',
    dataset: process.env.BIGQUERY_DATASET || 'truebrands_warehouse',
    location: process.env.BIGQUERY_LOCATION || 'US',
    maxBytesProcessed: parseInt(process.env.BIGQUERY_MAX_BYTES_PROCESSED ?? '1000000000', 10),
    timeout: parseInt(process.env.BIGQUERY_TIMEOUT_MS ?? '30000', 10),
    credentials,
    retries: parseInt(process.env.BIGQUERY_RETRIES ?? '3', 10),
    maxResults: parseInt(process.env.MAX_QUERY_RESULTS ?? '1000', 10),
  };
});
