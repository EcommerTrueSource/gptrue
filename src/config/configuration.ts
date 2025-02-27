import { registerAs } from '@nestjs/config';
import * as Joi from 'joi';

// Regex para validação de URLs
const urlRegex = /^https?:\/\/[\w-]+(\.[\w-]+)+([\w.,@?^=%&:/~+#-]*[\w@?^=%&/~+#-])?$/;

// Regex para validação de chaves API (padrão comum)
const apiKeyRegex = /^[a-zA-Z0-9_-]{10,}$/;

// Regex para validação de email
const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

// Regex para validação do formato da private key
const privateKeyRegex = /^-----BEGIN PRIVATE KEY-----[\s\S]*-----END PRIVATE KEY-----$/;

// Regex para validação do email de service account
const serviceAccountEmailRegex = /^[a-z0-9-]+@[a-z0-9-]+\.iam\.gserviceaccount\.com$/;

// Regex para validação do ID do projeto
const projectIdRegex = /^[a-z][-a-z0-9]{4,28}[a-z0-9]$/;

// Definindo o schema de validação (apenas para referência, não exportado)
const validationSchema = Joi.object({
  // Application settings
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test')
    .default('development')
    .description('Ambiente de execução da aplicação'),
  PORT: Joi.number().default(3000).description('Porta do servidor'),
  LOG_LEVEL: Joi.string()
    .valid('error', 'warn', 'info', 'http', 'verbose', 'debug', 'silly')
    .default('info')
    .description('Nível de log da aplicação'),
  FRONTEND_URL: Joi.string()
    .pattern(urlRegex)
    .default('http://localhost:3001')
    .description('URL do frontend'),
  CORS_ORIGIN: Joi.string()
    .pattern(urlRegex)
    .default('http://localhost:3001')
    .description('Origem permitida para CORS'),

  // BigQuery settings
  BIGQUERY_ENABLED: Joi.boolean().default(true),
  BIGQUERY_PROJECT_ID: Joi.string().pattern(projectIdRegex).required(),
  BIGQUERY_DATASET: Joi.string().required(),
  BIGQUERY_LOCATION: Joi.string().valid('US', 'EU', 'asia-northeast1').default('US'),
  BIGQUERY_MAX_BYTES_PROCESSED: Joi.number().min(1000000).max(1000000000000).default(100000000),
  BIGQUERY_TIMEOUT_MS: Joi.number().min(1000).max(300000).default(30000),
  GOOGLE_CLOUD_CLIENT_EMAIL: Joi.string().pattern(serviceAccountEmailRegex).required(),
  GOOGLE_CLOUD_PRIVATE_KEY: Joi.string().pattern(privateKeyRegex).required(),

  // Outras configurações...
});

export default registerAs('app', () => {
  // Log da configuração
  console.log('Loading application configuration...');

  return {
    environment: process.env.NODE_ENV || 'development',
    port: parseInt(process.env.PORT, 10) || 3000,
    logLevel: process.env.LOG_LEVEL || 'info',
    frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3001',
    corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:3001',

    // Outras configurações...
  };
});
