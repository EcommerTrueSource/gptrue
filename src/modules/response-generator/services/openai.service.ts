import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OpenAI } from 'openai';
import { GeneratedResponse } from '../interfaces/response-context.interface';

@Injectable()
export class OpenAIService {
  private openai: OpenAI;

  constructor(private readonly configService: ConfigService) {
    this.openai = new OpenAI({
      apiKey: this.configService.get<string>('OPENAI_API_KEY'),
    });
  }

  async generateResponse(prompt: string): Promise<Omit<GeneratedResponse, 'metadata'>> {
    try {
      const completion = await this.openai.chat.completions.create({
        model: this.configService.get<string>('OPENAI_MODEL') || 'gpt-4',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
        max_tokens: 1000,
      });

      const message = completion.choices[0]?.message?.content || 'Não foi possível gerar uma resposta';

      return {
        message,
        suggestions: [
          'Como isso se compara com o período anterior?',
          'Quais os principais fatores que influenciaram esse resultado?',
          'Que ações podemos tomar com base nesses dados?'
        ]
      };
    } catch (error) {
      throw new Error('Erro ao gerar resposta com OpenAI');
    }
  }
}
