import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';

@Injectable()
export class OpenAIService {
  private readonly logger = new Logger(OpenAIService.name);
  private readonly openai: OpenAI;
  private readonly model: string;

  constructor(private configService: ConfigService) {
    // Obter a chave da API diretamente do ConfigService ou do process.env
    const apiKey = this.configService.get<string>('openai.apiKey') ||
                  this.configService.get<string>('ai.openai.apiKey') ||
                  process.env.OPENAI_API_KEY;

    this.model = this.configService.get<string>('openai.model') ||
                this.configService.get<string>('ai.openai.model') ||
                process.env.OPENAI_MODEL ||
                'gpt-4o-mini';

    if (!apiKey) {
      throw new Error('Chave da API OpenAI não encontrada. Configure a variável OPENAI_API_KEY no arquivo .env');
    }

    this.openai = new OpenAI({
      apiKey: apiKey,
    });
    this.logger.log(`OpenAI inicializado com sucesso usando o modelo ${this.model}`);
  }

  async generateResponse(prompt: string): Promise<string> {
    try {
      const completion = await this.openai.chat.completions.create({
        model: this.model,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
        max_tokens: 2000,
      });

      return completion.choices[0]?.message?.content || '';
    } catch (error) {
      this.logger.error('Erro ao gerar resposta com OpenAI', error);
      throw new Error(`Falha ao gerar resposta com OpenAI: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}
