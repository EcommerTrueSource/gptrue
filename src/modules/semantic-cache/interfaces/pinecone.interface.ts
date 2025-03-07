import { RecordMetadataValue } from '@pinecone-database/pinecone';

export interface PineconeMetadata {
  question: string;
  response: string;
  query: string;
  executionTimeMs: number;
  sourceTables: string[];
  createdAt: string;
  updatedAt: string;
  version: string;
  feedbackPositive: number;
  feedbackNegative: number;
  feedbackComments: string[];
  feedbackCategories?: string[];
  lastFeedbackDate?: string;
  needsReview: boolean;

  // Estatísticas de uso
  usageCount?: number;           // Contador de quantas vezes este template foi usado
  lastUsedAt?: string;           // Timestamp da última utilização

  // Novos campos de contexto
  conversationTopics?: string[];     // Tópicos identificados na conversa
  relatedEntities?: string[];        // Entidades mencionadas (produtos, categorias, etc.)
  previousQuestions?: string[];      // Perguntas anteriores na mesma conversa
  conversationId?: string;           // ID da conversa para rastreabilidade (deprecated)
  conversationIds?: string[];        // Lista de IDs de conversas recentes que usaram este template (limitado a 10)

  // Campo para compatibilidade com a API do Pinecone
  [key: string]: RecordMetadataValue;
}
