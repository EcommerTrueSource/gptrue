import { Controller, Get, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { BigQueryService } from '../../../database/bigquery/bigquery.service';
import { VertexAIService } from '../../../integrations/vertex-ai/vertex-ai.service';
import { OpenAIService } from '../../../integrations/openai/openai.service';
import { SemanticCacheService } from '../../semantic-cache/services/semantic-cache.service';

@ApiTags('Health Check')
@Controller('health')
export class HealthController {
  private readonly logger = new Logger(HealthController.name);

  constructor(
    private readonly bigQueryService: BigQueryService,
    private readonly vertexAIService: VertexAIService,
    private readonly openAIService: OpenAIService,
    private readonly semanticCacheService: SemanticCacheService,
  ) {}

  @Get('bigquery')
  @ApiOperation({ summary: 'Testa a conexão com BigQuery' })
  @ApiResponse({ status: 200, description: 'Conexão bem sucedida' })
  @ApiResponse({ status: 500, description: 'Erro na conexão' })
  async testBigQuery() {
    try {
      // Testa uma query simples
      const query = 'SELECT 1 as test';
      const result = await this.bigQueryService.executeQuery(query);
      return { status: 'ok', message: 'Conexão com BigQuery estabelecida', result };
    } catch (error) {
      this.logger.error('Erro ao testar conexão com BigQuery', error);
      return { status: 'error', message: error instanceof Error ? error.message : 'Erro desconhecido' };
    }
  }

  @Get('vertex')
  @ApiOperation({ summary: 'Testa a conexão com Vertex AI' })
  @ApiResponse({ status: 200, description: 'Conexão bem sucedida' })
  @ApiResponse({ status: 500, description: 'Erro na conexão' })
  async testVertexAI() {
    try {
      // Testa uma geração simples
      const prompt = 'Gere uma consulta SQL simples que selecione os primeiros 5 registros de uma tabela chamada "produtos"';
      const result = await this.vertexAIService.generateSQL(prompt);
      return { status: 'ok', message: 'Conexão com Vertex AI estabelecida', result };
    } catch (error) {
      this.logger.error('Erro ao testar conexão com Vertex AI', error);
      return { status: 'error', message: error instanceof Error ? error.message : 'Erro desconhecido' };
    }
  }

  @Get('openai')
  @ApiOperation({ summary: 'Testa a conexão com OpenAI' })
  @ApiResponse({ status: 200, description: 'Conexão bem sucedida' })
  @ApiResponse({ status: 500, description: 'Erro na conexão' })
  async testOpenAI() {
    try {
      // Testa uma completação simples
      const prompt = 'Qual é a capital do Brasil?';
      const result = await this.openAIService.generateResponse(prompt);
      return { status: 'ok', message: 'Conexão com OpenAI estabelecida', result };
    } catch (error) {
      this.logger.error('Erro ao testar conexão com OpenAI', error);
      return { status: 'error', message: error instanceof Error ? error.message : 'Erro desconhecido' };
    }
  }

  @Get('pinecone')
  @ApiOperation({ summary: 'Testa a conexão com Pinecone' })
  @ApiResponse({ status: 200, description: 'Conexão bem sucedida' })
  @ApiResponse({ status: 500, description: 'Erro na conexão' })
  async testPinecone() {
    try {
      // Testa a conexão verificando o status do índice
      const status = await this.semanticCacheService.checkConnection();
      return { status: 'ok', message: 'Conexão com Pinecone estabelecida', details: status };
    } catch (error) {
      this.logger.error('Erro ao testar conexão com Pinecone', error);
      return { status: 'error', message: error instanceof Error ? error.message : 'Erro desconhecido' };
    }
  }

  @Get()
  @ApiOperation({ summary: 'Testa todas as conexões' })
  @ApiResponse({ status: 200, description: 'Status de todas as conexões' })
  async checkAll() {
    const results = {
      timestamp: new Date().toISOString(),
      services: {} as Record<string, any>,
    };

    try {
      results.services.bigquery = await this.testBigQuery();
    } catch (error) {
      results.services.bigquery = { status: 'error', message: error instanceof Error ? error.message : 'Erro desconhecido' };
    }

    try {
      results.services.vertexai = await this.testVertexAI();
    } catch (error) {
      results.services.vertexai = { status: 'error', message: error instanceof Error ? error.message : 'Erro desconhecido' };
    }

    try {
      results.services.openai = await this.testOpenAI();
    } catch (error) {
      results.services.openai = { status: 'error', message: error instanceof Error ? error.message : 'Erro desconhecido' };
    }

    try {
      results.services.pinecone = await this.testPinecone();
    } catch (error) {
      results.services.pinecone = { status: 'error', message: error instanceof Error ? error.message : 'Erro desconhecido' };
    }

    return results;
  }
}
