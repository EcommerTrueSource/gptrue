import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { VertexAI } from '@google-cloud/vertexai';

@Injectable()
export class VertexAIService {
  private readonly logger = new Logger(VertexAIService.name);
  private readonly vertexAi: VertexAI;
  private readonly model: string;
  private readonly location: string;

  constructor(private readonly configService: ConfigService) {
    const projectId = this.configService.get<string>('VERTEX_AI_PROJECT_ID');
    this.location = this.configService.get<string>('VERTEX_AI_LOCATION');
    this.model = this.configService.get<string>('VERTEX_AI_MODEL');

    this.vertexAi = new VertexAI({
      project: projectId,
      location: this.location,
    });

    this.logger.log('VertexAI Service inicializado');
  }

  async generateSQL(prompt: string): Promise<string> {
    try {
      this.logger.debug('Gerando SQL com VertexAI...');

      const generativeModel = this.vertexAi.preview.getGenerativeModel({
        model: this.model,
        generation_config: {
          max_output_tokens: this.configService.get<number>('VERTEX_AI_MAX_TOKENS'),
          temperature: this.configService.get<number>('VERTEX_AI_TEMPERATURE'),
        },
      });

      const result = await generativeModel.generateText(prompt);
      const generatedSql = this.extractSqlFromResponse(result.response.candidates[0].text);

      this.logger.debug('SQL gerado com sucesso');
      return generatedSql;
    } catch (error) {
      this.logger.error('Erro ao gerar SQL com VertexAI:', error);
      throw new Error(`Falha na geração de SQL: ${error.message}`);
    }
  }

  private extractSqlFromResponse(response: string): string {
    // Remove comentários e espaços em branco extras
    return response
      .trim()
      .replace(/^```sql\n?/, '')
      .replace(/\n?```$/, '')
      .trim();
  }
} 