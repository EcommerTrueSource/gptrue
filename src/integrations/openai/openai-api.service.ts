import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { OpenAIEmbeddings } from '@langchain/openai';
import { OpenAIMessage } from './interfaces/openai.interface';

@Injectable()
export class OpenAIApiService implements OnModuleInit {
  private readonly logger = new Logger(OpenAIApiService.name);
  private openai: OpenAI;
  private embeddings: OpenAIEmbeddings;

  constructor(private configService: ConfigService) {}

  async onModuleInit() {
    try {
      this.openai = new OpenAI({
        apiKey: this.configService.get<string>('ai.openai.apiKey'),
      });

      this.embeddings = new OpenAIEmbeddings({
        openAIApiKey: this.configService.get<string>('ai.openai.apiKey'),
        modelName: this.configService.get<string>('ai.openai.embeddingModel') || 'text-embedding-ada-002',
      });

      this.logger.log('OpenAI inicializado com sucesso');
    } catch (error) {
      this.logger.error(`Erro ao inicializar OpenAI: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Gera embeddings para um texto
   * @param text Texto para gerar embedding
   * @returns Vetor de embedding
   */
  async generateEmbedding(text: string): Promise<number[]> {
    try {
      const result = await this.embeddings.embedQuery(text);
      return result;
    } catch (error) {
      this.logger.error(`Erro ao gerar embedding: ${error.message}`, error.stack);
      throw new Error(`Falha ao gerar embedding: ${error.message}`);
    }
  }

  /**
   * Gera texto usando o modelo de linguagem
   * @param prompt Prompt para o modelo
   * @param options Opções adicionais
   * @returns Texto gerado
   */
  async generateText(
    messages: OpenAIMessage[],
    options: {
      temperature?: number;
      maxTokens?: number;
      model?: string;
    } = {},
  ): Promise<string> {
    try {
      const { temperature = 0.7, maxTokens = 2000, model = 'gpt-4' } = options;

      const response = await this.openai.chat.completions.create({
        model: model,
        messages: messages.map(msg => ({
          role: msg.role as any,
          content: msg.content,
        })) as any,
        temperature: temperature,
        max_tokens: maxTokens,
      });

      return response.choices[0]?.message?.content || '';
    } catch (error) {
      this.logger.error(`Erro ao gerar texto: ${error.message}`, error.stack);
      throw new Error(`Falha ao gerar texto: ${error.message}`);
    }
  }

  /**
   * Método de fallback para quando a API principal falha
   * Usa um modelo menor/mais rápido
   */
  async generateTextFallback(
    messages: OpenAIMessage[],
  ): Promise<string> {
    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: messages.map(msg => ({
          role: msg.role as any,
          content: msg.content,
        })) as any,
        temperature: 0.5,
        max_tokens: 1000,
      });

      return response.choices[0]?.message?.content || '';
    } catch (error) {
      this.logger.error(`Erro no fallback: ${error.message}`, error.stack);
      return 'Não foi possível gerar uma resposta no momento. Por favor, tente novamente mais tarde.';
    }
  }
} 