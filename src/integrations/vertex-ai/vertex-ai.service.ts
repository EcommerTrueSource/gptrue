import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { VertexAI } from '@google-cloud/vertexai';

@Injectable()
export class VertexAIService {
  private readonly logger = new Logger(VertexAIService.name);
  private readonly vertexai: VertexAI;
  private readonly model: string;
  private readonly location: string;

  constructor(private configService: ConfigService) {
    const projectId = this.configService.get<string>('vertexai.projectId');

    if (!projectId) {
      throw new Error('VertexAI projectId não configurado');
    }

    this.location = this.configService.get<string>('vertexai.location') || 'us-central1';
    this.model = this.configService.get<string>('vertexai.model') || 'text-bison@001';

    this.vertexai = new VertexAI({
      project: projectId,
      location: this.location,
    });

    this.logger.log('VertexAI Service inicializado com sucesso');
  }

  async generateSQL(prompt: string): Promise<string> {
    try {
      const generativeModel = this.vertexai.preview.getGenerativeModel({
        model: this.model,
        generationConfig: {
          maxOutputTokens: 1024,
          temperature: 0.2,
        },
      });

      const result = await generativeModel.generateContent(prompt);
      return result.response.candidates[0].content.parts[0].text;
    } catch (error) {
      this.logger.error('Erro ao gerar SQL com VertexAI', error);
      throw error;
    }
  }
}
