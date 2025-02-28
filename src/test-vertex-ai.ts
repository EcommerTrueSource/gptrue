import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';
import { VertexAIService } from './integrations/vertex-ai/vertex-ai.service';

async function bootstrap() {
  const logger = new Logger('TestVertexAI');
  logger.log('Iniciando teste do Vertex AI...');

  try {
    // Carrega as variáveis de ambiente
    logger.log(`GOOGLE_CLOUD_PROJECT_ID: ${process.env.GOOGLE_CLOUD_PROJECT_ID || 'não definido'}`);
    logger.log(`VERTEX_AI_PROJECT_ID: ${process.env.VERTEX_AI_PROJECT_ID || 'não definido'}`);

    // Cria a aplicação NestJS
    const app = await NestFactory.create(AppModule);

    // Obtém o serviço de configuração
    const configService = app.get(ConfigService);
    logger.log(`Config vertexai.projectId: ${configService.get('vertexai.projectId') || 'não definido'}`);
    logger.log(`Config ai.vertexAi.projectId: ${configService.get('ai.vertexAi.projectId') || 'não definido'}`);

    // Obtém o serviço do Vertex AI
    const vertexAIService = app.get(VertexAIService);
    logger.log('Serviço do Vertex AI obtido com sucesso!');

    // Testa a geração de SQL
    const prompt = 'Gere uma consulta SQL que retorne os 5 produtos mais vendidos no último mês';
    const sql = await vertexAIService.generateSQL(prompt);
    logger.log('SQL gerado com sucesso:');
    logger.log(sql);

    await app.close();
  } catch (error) {
    logger.error('Erro ao testar o Vertex AI:', error);
  }
}

bootstrap();
