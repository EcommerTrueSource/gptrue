import { registerAs } from '@nestjs/config';

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
