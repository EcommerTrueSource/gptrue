import { registerAs } from '@nestjs/config';
import { Logger } from '@nestjs/common';

export interface BigQueryConfig {
  projectId: string;
  keyFilename: string;
  location: string;
  maxBytes: string;
  enabled: boolean;
}

export default registerAs('bigquery', (): BigQueryConfig => {
  const logger = new Logger('BigQueryConfig');
  const projectId = process.env.BIGQUERY_PROJECT_ID;
  const keyFilename = process.env.BIGQUERY_KEY_FILE;
  let enabled = true;
  
  if (!projectId) {
    logger.warn('BIGQUERY_PROJECT_ID não definido, BigQuery será desabilitado');
    enabled = false;
  }
  
  if (!keyFilename) {
    logger.warn('BIGQUERY_KEY_FILE não definido, BigQuery será desabilitado');
    enabled = false;
  }
  
  return {
    projectId: projectId || 'mock-project-id',
    keyFilename: keyFilename || './keys/bigquery-dev.json',
    location: process.env.BIGQUERY_LOCATION || 'US',
    maxBytes: process.env.BIGQUERY_MAX_BYTES || '1073741824', // 1GB em bytes
    enabled,
  };
});
