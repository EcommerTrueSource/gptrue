import { registerAs } from '@nestjs/config';

export default registerAs('vertexai', () => {
  console.log('Carregando configuração do Vertex AI...');
  console.log(`Project ID: ${process.env.GOOGLE_CLOUD_PROJECT_ID || 'não definido'}`);

  // Garantindo que o ID do projeto seja 'truebrands-warehouse'
  const projectId = process.env.GOOGLE_CLOUD_PROJECT_ID || 'truebrands-warehouse';

  return {
    projectId: projectId,
    location: process.env.VERTEX_AI_LOCATION || 'us-central1',
    model: process.env.VERTEX_AI_MODEL || 'text-bison@001',
    maxTokens: parseInt(process.env.VERTEX_AI_MAX_TOKENS || '1024', 10),
    temperature: parseFloat(process.env.VERTEX_AI_TEMPERATURE || '0.2'),
  };
});
