import { registerAs } from '@nestjs/config';

export default registerAs('bigquery', () => ({
  projectId: process.env.GOOGLE_CLOUD_PROJECT_ID,
  keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS,
  location: process.env.BIGQUERY_LOCATION || 'US',
  dataset: process.env.BIGQUERY_DATASET,
  maxBytesProcessed: parseInt(process.env.BIGQUERY_MAX_BYTES_PROCESSED, 10) || 1000000000, // 1GB
  timeoutMs: parseInt(process.env.BIGQUERY_TIMEOUT_MS, 10) || 30000, // 30 segundos
  tables: {
    pedidos: 'PEDIDOS',
    produtos: 'PRODUTOS',
    assinatura: 'ASSINATURA',
    clientes: 'CLIENTES',
    statusClientes: 'STATUS_CLIENTES',
    statusAssinantes: 'STATUS_ASSINANTES',
  },
  querySettings: {
    maximumBytesBilled: process.env.BIGQUERY_MAXIMUM_BYTES_BILLED || '1000000000000',
    useQueryCache: process.env.BIGQUERY_USE_QUERY_CACHE !== 'false',
    maximumResults: parseInt(process.env.BIGQUERY_MAXIMUM_RESULTS || '1000', 10),
  },
})); 