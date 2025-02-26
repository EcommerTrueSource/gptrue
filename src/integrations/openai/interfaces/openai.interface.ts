/**
 * Interface para mensagens do OpenAI
 */
export interface OpenAIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

/**
 * Interface para opções de geração de texto
 */
export interface TextGenerationOptions {
  temperature?: number;
  maxTokens?: number;
  model?: string;
}

/**
 * Interface para o prompt do OpenAI
 */
export interface OpenAIPrompt {
  messages: OpenAIMessage[];
  options?: TextGenerationOptions;
}
