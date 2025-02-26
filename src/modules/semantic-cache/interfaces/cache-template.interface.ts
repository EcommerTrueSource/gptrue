export interface CacheTemplate {
  id: string; // ID único do template
  question: string; // Pergunta original do usuário
  questionEmbedding: number[]; // Vetor de embedding da pergunta
  query?: string; // Consulta SQL gerada (se aplicável)
  queryResult?: any; // Resultado bruto da consulta
  response: string; // Resposta formatada em linguagem natural
  metadata: CacheMetadata;
  feedback: CacheFeedback;
  ttl?: Date; // Time to live (opcional)
}

export interface CacheMetadata {
  createdAt: Date; // Data de criação
  updatedAt: Date; // Data da última atualização
  version: string; // Versão do modelo/sistema
  executionTimeMs: number; // Tempo de execução
  queryComplexity?: number; // Estimativa de complexidade da query
  sourceTables: string[]; // Tabelas utilizadas na consulta
}

export interface CacheFeedback {
  positive: number; // Contagem de feedback positivo
  negative: number; // Contagem de feedback negativo
  comments: string[]; // Comentários de feedback (opcional)
  needsReview: boolean; // Flag para revisão manual
}

export interface CacheSearchResult {
  template: CacheTemplate;
  similarity: number; // Score de similaridade (0-1)
  isValid: boolean; // Indica se o cache ainda é válido
}
