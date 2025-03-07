import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { VertexAI } from '@google-cloud/vertexai';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class VertexAIService {
  private readonly logger = new Logger(VertexAIService.name);
  private readonly vertexai: VertexAI;
  private readonly model: string;
  private readonly location: string;

  constructor(private configService: ConfigService) {
    // Tenta obter o projectId da nova configuração específica
    let projectId =
      this.configService.get<string>('vertexai.projectId') ||
      this.configService.get<string>('ai.vertexAi.projectId') ||
      process.env.GOOGLE_CLOUD_PROJECT_ID ||
      process.env.VERTEX_AI_PROJECT_ID;

    // Garante que o ID do projeto seja 'truebrands-warehouse'
    if (!projectId) {
      projectId = 'truebrands-warehouse';
    }

    this.logger.debug(`Tentando inicializar VertexAI com projectId: ${projectId}`);

    this.location = this.configService.get<string>('vertexai.location') ||
                    this.configService.get<string>('ai.vertexAi.location') ||
                    process.env.VERTEX_AI_LOCATION ||
                    'us-central1';

    this.model = this.configService.get<string>('vertexai.model') ||
                this.configService.get<string>('ai.vertexAi.model') ||
                process.env.VERTEX_AI_MODEL ||
                'gemini-1.0-pro';

    // Verificar se existe o arquivo de credenciais
    const keyFilePath = this.configService.get<string>('bigquery.keyFilename') ||
                       process.env.BIGQUERY_KEY_FILE ||
                       './keys/bigquery-dev.json';

    if (!fs.existsSync(keyFilePath)) {
      throw new Error(`Arquivo de credenciais não encontrado: ${keyFilePath}. Configure corretamente o arquivo de credenciais.`);
    }

    // Definir a variável de ambiente GOOGLE_APPLICATION_CREDENTIALS
    process.env.GOOGLE_APPLICATION_CREDENTIALS = path.resolve(keyFilePath);

    this.logger.debug(`Usando arquivo de credenciais: ${process.env.GOOGLE_APPLICATION_CREDENTIALS}`);

    // Inicializar o VertexAI
    this.vertexai = new VertexAI({
      project: projectId,
      location: this.location,
    });

    this.logger.log(`VertexAI Service inicializado com sucesso. Project ID: ${projectId}, Location: ${this.location}, Model: ${this.model}`);
  }

  async generateSQL(prompt: string): Promise<string> {
    try {
      this.logger.debug('Iniciando geração de SQL com Vertex AI');

      // Usar a API correta para o modelo Gemini
      const generativeModel = this.vertexai.getGenerativeModel({
        model: this.model,
        generationConfig: {
          maxOutputTokens: 1024,
          temperature: 0.2,
        },
      });

      // Formatar a requisição para o modelo Gemini
      const request = {
        contents: [
          {
            role: 'user',
            parts: [{ text: prompt }],
          },
        ],
      };

      // Gerar o conteúdo
      this.logger.debug('Enviando requisição para o Vertex AI');
      const result = await generativeModel.generateContent(request);

      // Extrair o texto da resposta
      const response = result.response;
      let text = response.candidates[0].content.parts[0].text;

      this.logger.debug('Resposta bruta recebida do Vertex AI', { rawResponse: text });

      // Processar o texto para extrair apenas a consulta SQL
      // Remover blocos de código markdown se presentes
      text = text.replace(/```sql\s*|\s*```/g, '');

      // Remover explicações ou texto antes da consulta
      if (text.toUpperCase().includes('SELECT') || text.toUpperCase().includes('WITH')) {
        // Encontrar o início da consulta SQL
        const selectIndex = text.toUpperCase().indexOf('SELECT');
        const withIndex = text.toUpperCase().indexOf('WITH');

        let startIndex = -1;
        if (selectIndex >= 0 && withIndex >= 0) {
          startIndex = Math.min(selectIndex, withIndex);
        } else if (selectIndex >= 0) {
          startIndex = selectIndex;
        } else if (withIndex >= 0) {
          startIndex = withIndex;
        }

        if (startIndex >= 0) {
          const originalText = text;
          text = text.substring(startIndex);
          this.logger.debug('SQL processado', {
            original: originalText,
            processed: text,
            startIndex
          });
        }
      }

      this.logger.debug('SQL gerado e processado com sucesso', { sql: text });
      return text;
    } catch (error) {
      this.logger.error('Erro ao gerar SQL com VertexAI', error);
      throw new Error(`Falha ao gerar SQL com VertexAI: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}
