import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { VertexAI, GenerativeModelPreview, GenerateContentResult, Content } from '@google-cloud/vertexai';

@Injectable()
export class VertexAIService {
  private readonly logger = new Logger(VertexAIService.name);
  private readonly vertexAi: VertexAI;
  private readonly model: string;
  private readonly location: string;
  private generativeModel: GenerativeModelPreview;

  constructor(private readonly configService: ConfigService) {
    try {
      const projectId = this.configService.get<string>('VERTEX_AI_PROJECT_ID');
      this.location = this.configService.get<string>('VERTEX_AI_LOCATION') || 'us-central1';
      this.model = this.configService.get<string>('VERTEX_AI_MODEL') || 'text-bison';

      if (!projectId) {
        throw new Error('VERTEX_AI_PROJECT_ID não configurado');
      }

      this.vertexAi = new VertexAI({
        project: projectId,
        location: this.location,
      });

      this.generativeModel = this.vertexAi.preview.getGenerativeModel({
        model: this.model,
        generationConfig: {
          maxOutputTokens: this.configService.get<number>('VERTEX_AI_MAX_TOKENS') || 1024,
          temperature: this.configService.get<number>('VERTEX_AI_TEMPERATURE') || 0.2,
        },
      });

      this.logger.log('VertexAI Service inicializado com sucesso');
    } catch (error: unknown) {
      const err = error as Error;
      this.logger.error(`Erro ao inicializar VertexAI: ${err.message}`, err.stack);
      throw new Error(`Falha ao inicializar VertexAI: ${err.message}`);
    }
  }

  async generateSQL(prompt: string): Promise<string> {
    try {
      this.logger.debug('Gerando SQL com VertexAI...');

      const request = {
        contents: [{
          role: 'user',
          parts: [{ text: prompt }]
        }] as Content[],
      };

      const result = await this.generativeModel.generateContent(request);
      const response = result.response;

      if (!response?.candidates?.[0]?.content?.parts?.[0]?.text) {
        throw new Error('Resposta inválida do VertexAI');
      }

      const generatedSql = this.extractSqlFromResponse(response.candidates[0].content.parts[0].text);

      this.logger.debug('SQL gerado com sucesso');
      return generatedSql;
    } catch (error: unknown) {
      const err = error as Error;
      this.logger.error('Erro ao gerar SQL com VertexAI:', err.message);
      throw new Error(`Falha na geração de SQL: ${err.message}`);
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
