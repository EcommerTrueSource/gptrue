import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Pinecone, PineconeRecord } from '@pinecone-database/pinecone';
import { v4 as uuidv4 } from 'uuid';
import { CacheTemplate, SimilaritySearchResult, CacheConfig } from '../interfaces/cache.interface';
import { ProcessingResult } from '../../orchestrator/interfaces/conversation.interface';
import { OpenAIEmbeddings } from '@langchain/openai';
import { PineconeMetadata } from '../interfaces/pinecone.interface';
import { ISemanticCacheService, HealthStatus, CacheClearResult, ConversationContext, FeedbackData } from '../interfaces/semantic-cache.interface';
import { Template, TemplateUpdateRequest, CacheClearOptions } from '../../orchestrator/interfaces/orchestrator.interface';
import { extractTopics, extractEntities } from '../utils/context-extractor';

@Injectable()
export class SemanticCacheService implements ISemanticCacheService {
  private readonly logger = new Logger(SemanticCacheService.name);
  private readonly pinecone: Pinecone;
  private embeddings: OpenAIEmbeddings;
  private config: CacheConfig;

  constructor(private readonly configService: ConfigService) {
    this.config = {
      similarityThreshold: this.configService.get<number>('PINECONE_SIMILARITY_THRESHOLD') || 0.85,
      ttlEnabled: this.configService.get<boolean>('PINECONE_TTL_ENABLED') || false,
      ttlDays: this.configService.get<number>('PINECONE_TTL_DAYS') || 30,
      namespace: this.configService.get<string>('PINECONE_NAMESPACE') || 'default',
    };

    this.embeddings = new OpenAIEmbeddings({
      openAIApiKey: this.configService.get<string>('OPENAI_API_KEY'),
      modelName: this.configService.get<string>('ai.openai.embeddingModel') || 'text-embedding-ada-002',
    });

    const pineconeApiKey = this.configService.get<string>('PINECONE_API_KEY');
    if (!pineconeApiKey) {
      this.logger.error('Chave de API do Pinecone não encontrada nas variáveis de ambiente');
      throw new Error('PINECONE_API_KEY não configurada');
    }

    this.logger.debug(`Inicializando Pinecone com API Key: ${pineconeApiKey.substring(0, 5)}...`);

    this.pinecone = new Pinecone({
      apiKey: pineconeApiKey,
    });
    this.logger.log('Pinecone inicializado com sucesso');
  }

  async findSimilarQuestion(
    question: string,
    context?: ConversationContext,
    conversationId?: string
  ): Promise<ProcessingResult | null> {
    try {
      this.logger.log(`[CACHE] Iniciando busca por pergunta similar: "${question}"`);

      if (!this.pinecone) {
        this.logger.error('[CACHE] Cliente Pinecone não inicializado');
        throw new Error('Cliente Pinecone não inicializado');
      }

      // Gerar embedding para a pergunta
      const embedding = await this.generateEmbedding(question);

      // Obter o índice do Pinecone
      const indexName = this.configService.get<string>('PINECONE_INDEX');
      this.logger.debug(`[CACHE] Usando índice Pinecone: ${indexName}`);

      if (!indexName) {
        this.logger.error('[CACHE] Nome do índice Pinecone não configurado');
        throw new Error('Nome do índice Pinecone não configurado');
      }

      const index = this.pinecone.Index(indexName);

      const similarityThreshold = this.config.similarityThreshold;

      // ETAPA 1: Busca inicial sem filtros para encontrar correspondências exatas
      this.logger.debug(`[CACHE] Realizando busca inicial sem filtros para encontrar correspondências exatas`);

      const initialQueryResult = await index.query({
        vector: embedding,
        topK: 10,
        includeMetadata: true
      });

      // Verificar correspondência exata de texto primeiro
      const exactTextMatch = initialQueryResult.matches?.find(match => {
        const metadata = match.metadata as unknown as PineconeMetadata;
        if (!metadata.question) {
          return false;
        }
        const isExactMatch = metadata.question.toLowerCase().trim() === question.toLowerCase().trim();
        if (isExactMatch) {
          this.logger.log(`[CACHE] Encontrada correspondência EXATA de texto com ID: ${match.id}, score: ${match.score}`);
        }
        return isExactMatch;
      });

      if (exactTextMatch) {
        this.logger.log(`[CACHE] Usando correspondência exata encontrada na busca inicial com ID: ${exactTextMatch.id}, score: ${exactTextMatch.score}`);
        return this.processExactMatch(exactTextMatch, question, similarityThreshold, conversationId, index);
      }

      // ETAPA 2: Se não encontrou correspondência exata, tentar com filtros de contexto
      // Extrair tópicos e entidades da pergunta atual
      const questionTopics = extractTopics(question);
      const questionEntities = extractEntities(question);

      // Combinar com o contexto fornecido
      const allTopics = [
        ...new Set([
          ...questionTopics,
          ...(context?.topics || [])
        ])
      ];

      const allEntities = [
        ...new Set([
          ...questionEntities,
          ...(context?.entities || [])
        ])
      ];

      // Construir filtro de contexto
      const contextFilter: Record<string, any> = {};

      // Adicionar filtros de tópicos e entidades se houver pelo menos 2 itens
      if (allTopics.length >= 2) {
        contextFilter.conversationTopics = { $in: allTopics };
      }

      if (allEntities.length >= 1) {
        contextFilter.relatedEntities = { $in: allEntities };
      }

      // Se tiver conversationId, adicionar como filtro opcional
      if (conversationId) {
        // Buscar registros que tenham este conversationId na lista de conversationIds
        // OU que não tenham conversationIds definido (compatibilidade com registros antigos)
        contextFilter.$or = [
          { conversationIds: { $in: [conversationId] } },
          { conversationId: conversationId },
          { conversationIds: { $exists: false } }
        ];
      }

      this.logger.debug(`[CACHE] Buscando pergunta similar com filtros de contexto no índice: ${indexName} com limiar: ${similarityThreshold}`);

      // Buscar no Pinecone com filtro de contexto
      const queryResult = await index.query({
        vector: embedding,
        topK: 5,
        includeMetadata: true,
        filter: Object.keys(contextFilter).length > 0 ? contextFilter : undefined
      });

      // Verificar correspondência exata de texto primeiro
      const exactMatch = queryResult.matches?.find(match => {
        const metadata = match.metadata as unknown as PineconeMetadata;
        if (!metadata.question) {
          return false;
        }
        const isExactMatch = metadata.question.toLowerCase().trim() === question.toLowerCase().trim();
        if (isExactMatch) {
          this.logger.log(`[CACHE] Encontrada correspondência EXATA de texto com ID: ${match.id}, score: ${match.score}`);
        }
        return isExactMatch;
      });

      if (exactMatch) {
        this.logger.log(`[CACHE] Usando correspondência exata com ID: ${exactMatch.id}, score: ${exactMatch.score}`);
        return this.processExactMatch(exactMatch, question, similarityThreshold, conversationId, index);
      }

      // Se não encontrou correspondência exata, verificar por similaridade
      if (queryResult.matches && queryResult.matches.length > 0) {
        const bestMatch = queryResult.matches[0];
        const score = bestMatch.score;

        // Usar um limiar mais conservador para evitar falsos positivos
        const adjustedThreshold = Math.max(similarityThreshold, 0.88);

        if (score >= adjustedThreshold) {
          this.logger.log(`[CACHE] Encontrada correspondência por SIMILARIDADE com ID: ${bestMatch.id}, score: ${score}`);

          // Extrair informações estruturadas das perguntas
          const currentInfo = this.extractQueryStructure(question.toLowerCase().trim());
          const metadata = bestMatch.metadata as unknown as PineconeMetadata;
          const cachedQuestion = metadata.question?.toLowerCase().trim() || '';
          const cachedInfo = this.extractQueryStructure(cachedQuestion);

          // Calcular pontuação de compatibilidade
          const compatibilityScore = this.calculateCompatibilityScore(currentInfo, cachedInfo);
          this.logger.debug(`[CACHE] Pontuação de compatibilidade: ${compatibilityScore}`);

          // Verificar se a compatibilidade é alta o suficiente
          if (compatibilityScore >= 0.8) {
            this.logger.log(`[CACHE] Alta compatibilidade (${compatibilityScore.toFixed(2)}) entre perguntas. Usando resultado do cache.`);
            return this.processQueryResults(bestMatch, question, adjustedThreshold);
        } else {
            this.logger.log(`[CACHE] Baixa compatibilidade (${compatibilityScore.toFixed(2)}) entre perguntas apesar do score alto (${score}). Ignorando resultado.`);
            return null;
          }
        } else {
          this.logger.log(`[CACHE] Melhor correspondência (ID: ${bestMatch.id}) tem score ${score} abaixo do limiar ${adjustedThreshold}`);
        }
      } else {
        this.logger.log(`[CACHE] Nenhuma correspondência encontrada para a pergunta`);
      }

      return null;
    } catch (error) {
      this.logger.error(`[CACHE] Erro ao buscar pergunta similar: ${error instanceof Error ? error.message : String(error)}`);
      return null;
    }
  }

  /**
   * Processa uma correspondência exata, atualizando metadados e retornando o resultado
   * Extraído para evitar duplicação de código
   */
  private async processExactMatch(
    exactMatch: any,
    question: string,
    similarityThreshold: number,
    conversationId?: string,
    index?: any
  ): Promise<ProcessingResult | null> {
    try {
      // Se tiver conversationId e o registro não tiver este ID na lista, atualizar
      const metadata = exactMatch.metadata as unknown as PineconeMetadata;
      let shouldUpdate = false;
      let conversationIds: string[] = [];

      // Incrementar contador de uso e atualizar timestamp
      const usageCount = (metadata.usageCount || 0) + 1;
      const lastUsedAt = this.getBrazilianTimestamp();
      shouldUpdate = true;

      // Verificar se já existe uma lista de conversationIds
      if (conversationId) {
        if (metadata.conversationIds && Array.isArray(metadata.conversationIds)) {
          // Se o conversationId não estiver na lista, adicionar
          if (!metadata.conversationIds.includes(conversationId)) {
            // Manter apenas os 10 IDs mais recentes + o novo
            conversationIds = [
              conversationId,
              ...metadata.conversationIds.slice(0, 9)
            ];
            shouldUpdate = true;
          } else {
            // Se já estiver na lista, manter como está
            conversationIds = [...metadata.conversationIds];
          }
        } else {
          // Se não existir lista, criar uma nova
          conversationIds = [conversationId];
          shouldUpdate = true;
        }
      }

      // Atualizar o registro se necessário
      if (shouldUpdate && index) {
        this.logger.debug(`[CACHE] Atualizando estatísticas de uso para o registro ${exactMatch.id}`);
        try {
          await index.update({
            id: exactMatch.id,
            metadata: {
              usageCount,
              lastUsedAt,
              ...(conversationIds.length > 0 ? { conversationIds } : {}),
              updatedAt: this.getBrazilianTimestamp()
            }
          });
          this.logger.debug(`[CACHE] Registro ${exactMatch.id} atualizado com sucesso. Novo usageCount: ${usageCount}`);
        } catch (updateError) {
          this.logger.error(`[CACHE] Erro ao atualizar registro ${exactMatch.id}: ${updateError instanceof Error ? updateError.message : String(updateError)}`);
          // Continuar mesmo com erro de atualização
        }
      }

      // Retornar o resultado do cache
      return this.processQueryResults(exactMatch, question, similarityThreshold);
    } catch (error) {
      this.logger.error(`[CACHE] Erro ao processar correspondência exata: ${error instanceof Error ? error.message : String(error)}`);
      return null;
    }
  }

  /**
   * Processa os resultados da consulta ao Pinecone
   * Extraído para evitar duplicação de código
   */
  private processQueryResults(
    match: any,
    question: string,
    similarityThreshold: number
  ): ProcessingResult | null {
    try {
      const metadata = match.metadata as unknown as PineconeMetadata;
      const score = match.score;

      // Verificar se o score está acima do limiar
      if (score < similarityThreshold) {
        this.logger.debug(`[CACHE] Score ${score} abaixo do limiar ${similarityThreshold}`);
        return null;
      }

      // Verificar se a pergunta é semanticamente similar
      // Adicionar verificações adicionais para garantir que a pergunta é realmente similar
      const currentQuestion = question.toLowerCase().trim();
      const cachedQuestion = metadata.question?.toLowerCase().trim() || '';

      // Extrair informações estruturadas das perguntas
      const currentInfo = this.extractQueryStructure(currentQuestion);
      const cachedInfo = this.extractQueryStructure(cachedQuestion);

      this.logger.debug(`[CACHE] Informações extraídas da pergunta atual:`, currentInfo);
      this.logger.debug(`[CACHE] Informações extraídas da pergunta em cache:`, cachedInfo);

      // Calcular pontuação de compatibilidade entre as perguntas
      const compatibilityScore = this.calculateCompatibilityScore(currentInfo, cachedInfo);
      this.logger.debug(`[CACHE] Pontuação de compatibilidade: ${compatibilityScore}`);

      // Definir um limiar de compatibilidade (ajustável conforme necessário)
      const compatibilityThreshold = 0.7;
      if (compatibilityScore < compatibilityThreshold) {
        this.logger.debug(`[CACHE] Pontuação de compatibilidade ${compatibilityScore} abaixo do limiar ${compatibilityThreshold}`);
        return null;
      }

      // Verificar se as perguntas têm o mesmo objetivo
      const isQueryTypeCompatible = this.checkQueryTypeCompatibility(currentQuestion, cachedQuestion);
      if (!isQueryTypeCompatible) {
        this.logger.debug(`[CACHE] Perguntas têm objetivos diferentes apesar do score alto: ${score}`);
        return null;
      }

      // Verificar se as entidades principais são as mesmas
      const entitiesMatch = this.checkEntitiesMatch(currentQuestion, cachedQuestion);
      if (!entitiesMatch) {
        this.logger.debug(`[CACHE] Entidades principais diferentes apesar do score alto: ${score}`);
        return null;
      }

      // Se passou por todas as verificações, processar o resultado
      this.logger.log(`[CACHE] Usando resultado do cache para pergunta similar. Match ID: ${match.id}, Score: ${score}, Compatibilidade: ${compatibilityScore.toFixed(2)}`);

      // Construir o resultado
      const result: ProcessingResult = {
        message: metadata.response || '',
        metadata: {
          source: 'cache',
          confidence: score * compatibilityScore, // Ajustar confiança com base na compatibilidade
          processingTimeMs: 0,
          cacheId: match.id,
          isExactMatch: false,
          originalQuestion: metadata.question,
          currentQuestion: question,
          sql: metadata.query,
          tables: []
        },
        suggestions: Array.isArray(metadata.suggestions) ? metadata.suggestions : []
      };

      return result;
    } catch (error) {
      this.logger.error(`[CACHE] Erro ao processar resultado da consulta: ${error instanceof Error ? error.message : String(error)}`);
      return null;
    }
  }

  /**
   * Verifica se duas perguntas têm o mesmo tipo de consulta
   * @param currentQuestion Pergunta atual
   * @param cachedQuestion Pergunta em cache
   * @returns true se as perguntas têm o mesmo tipo de consulta
   */
  private checkQueryTypeCompatibility(currentQuestion: string, cachedQuestion: string): boolean {
    // Normalizar as perguntas
    const normalizedCurrent = currentQuestion.toLowerCase().trim();
    const normalizedCached = cachedQuestion.toLowerCase().trim();

    this.logger.debug(`[COMPAT] Analisando compatibilidade entre perguntas:`);
    this.logger.debug(`[COMPAT] Atual: "${normalizedCurrent}"`);
    this.logger.debug(`[COMPAT] Cache: "${normalizedCached}"`);

    // Extrair informações estruturadas
    const currentInfo = this.extractQueryStructure(normalizedCurrent);
    const cachedInfo = this.extractQueryStructure(normalizedCached);

    // Verificar compatibilidade de período (mês/ano)
    if (currentInfo.month && cachedInfo.month &&
        currentInfo.year && cachedInfo.year) {
      // Se ambas têm mês e ano, devem ser iguais
      if (currentInfo.month !== cachedInfo.month ||
          currentInfo.year !== cachedInfo.year) {
        this.logger.debug(`[COMPAT] Períodos diferentes: ${currentInfo.month}/${currentInfo.year} vs ${cachedInfo.month}/${cachedInfo.year}`);
        return false;
      }
    }

    // Verificar compatibilidade de tipo de consulta
    if (currentInfo.isTopN && cachedInfo.isTopN) {
      // Ambas são consultas "top N"
      if (currentInfo.topN <= cachedInfo.topN) {
        this.logger.debug(`[COMPAT] Consultas top N compatíveis: ${currentInfo.topN} <= ${cachedInfo.topN}`);
        return true;
      } else {
        this.logger.debug(`[COMPAT] Consultas top N incompatíveis: ${currentInfo.topN} > ${cachedInfo.topN}`);
        return false;
      }
    } else if (currentInfo.isPosition && cachedInfo.isTopN) {
      // Atual é posição específica, cache é top N
      if (currentInfo.position <= cachedInfo.topN) {
        this.logger.debug(`[COMPAT] Posição ${currentInfo.position} está dentro do top ${cachedInfo.topN}`);
        return true;
      } else {
        this.logger.debug(`[COMPAT] Posição ${currentInfo.position} está fora do top ${cachedInfo.topN}`);
        return false;
      }
    } else if (currentInfo.isPosition && cachedInfo.isPosition) {
      // Ambas são posições específicas
      if (currentInfo.position === cachedInfo.position) {
        this.logger.debug(`[COMPAT] Posições iguais: ${currentInfo.position}`);
        return true;
      } else {
        this.logger.debug(`[COMPAT] Posições diferentes: ${currentInfo.position} vs ${cachedInfo.position}`);
        return false;
      }
    }

    // Se chegou até aqui, as consultas não são compatíveis
    this.logger.debug(`[COMPAT] Consultas não são compatíveis`);
    return false;
  }

  /**
   * Extrai a estrutura de uma consulta
   * @param question Pergunta normalizada
   * @returns Estrutura da consulta
   */
  private extractQueryStructure(question: string): {
    isTopN: boolean;
    isPosition: boolean;
    topN: number;
    position: number;
    month: string;
    year: string;
  } {
    const result = {
      isTopN: false,
      isPosition: false,
      topN: 0,
      position: 0,
      month: '',
      year: ''
    };

    // Extrair mês e ano
    const monthYearPattern = /(?:em|no|na|nos|nas)\s+(\w+)\s+(?:de\s+)?(\d{4})/i;
    const monthYearMatch = question.match(monthYearPattern);

    if (monthYearMatch && monthYearMatch[1] && monthYearMatch[2]) {
      result.month = monthYearMatch[1].toLowerCase();
      result.year = monthYearMatch[2];
    }

    // Detectar consulta "top N"
    const topNPattern = /(?:top|melhores|principais)\s+(\d+)\s+(?:produtos?|itens?)\s+mais\s+vendidos?/i;
    const topNMatch = question.match(topNPattern);

    if (topNMatch && topNMatch[1]) {
      result.isTopN = true;
      result.topN = parseInt(topNMatch[1], 10);
      return result;
    }

    // Detectar posição específica por palavras
    const positionWords = {
        'primeiro': 1, 'segundo': 2, 'terceiro': 3, 'quarto': 4, 'quinto': 5,
        'sexto': 6, 'sétimo': 7, 'oitavo': 8, 'nono': 9, 'décimo': 10
      };

    for (const [word, position] of Object.entries(positionWords)) {
      if (question.includes(word) &&
          question.includes('produto') &&
          question.includes('mais vendido')) {
        result.isPosition = true;
        result.position = position;
        return result;
      }
    }

    // Detectar posição específica por números ordinais
    const ordinalPattern = /(\d+)(?:º|°|o)\s+(?:produto|item)\s+mais\s+vendido/i;
    const ordinalMatch = question.match(ordinalPattern);

    if (ordinalMatch && ordinalMatch[1]) {
      result.isPosition = true;
      result.position = parseInt(ordinalMatch[1], 10);
      return result;
    }

    // Detectar posição específica por contexto
    if (question.includes('produto') &&
        question.includes('mais vendido')) {
      // Procurar por números na pergunta
      const numberPattern = /\b(\d+)\b/;
      const numberMatch = question.match(numberPattern);

      if (numberMatch && numberMatch[1]) {
        const num = parseInt(numberMatch[1], 10);

        // Determinar se é mais provável que seja uma posição ou um top N
        if (question.includes('top') ||
            question.includes('melhores') ||
            question.includes('principais')) {
          result.isTopN = true;
          result.topN = num;
        } else {
          result.isPosition = true;
          result.position = num;
        }
      } else {
        // Se não tem número, mas fala de produto mais vendido, assumir que é o primeiro
        result.isPosition = true;
        result.position = 1;
      }
    }

    return result;
  }

  /**
   * Calcula a pontuação de compatibilidade entre duas consultas
   * @param current Informações da consulta atual
   * @param cached Informações da consulta em cache
   * @returns Pontuação de compatibilidade (0-1)
   */
  private calculateCompatibilityScore(current: {
    isTopN: boolean;
    isPosition: boolean;
    topN: number;
    position: number;
    month: string;
    year: string;
  }, cached: {
    isTopN: boolean;
    isPosition: boolean;
    topN: number;
    position: number;
    month: string;
    year: string;
  }): number {
    let score = 0;
    let totalFactors = 0;

    // Verificar compatibilidade de tipo de consulta
    if (current.isTopN && cached.isTopN) {
      // Ambas são consultas "top N"
      if (current.topN <= cached.topN) {
        score += 0.3;
      } else {
        score -= 0.3;
      }
    } else if (current.isPosition && cached.isTopN) {
      // Atual é posição específica, cache é top N
      if (current.position <= cached.topN) {
        score += 0.3;
      } else {
        score -= 0.3;
      }
    } else if (current.isPosition && cached.isPosition) {
      // Ambas são posições específicas
      if (current.position === cached.position) {
        score += 0.3;
      } else {
        score -= 0.3;
      }
    } else if (current.isTopN && cached.isPosition) {
      // Atual é top N, cache é posição específica
      if (cached.position <= current.topN) {
        score += 0.1; // Pontuação menor pois é menos útil
      } else {
        score -= 0.3;
      }
    }
    totalFactors += 0.3;

    // Verificar compatibilidade de período de tempo
    if (current.month && cached.month &&
        current.year && cached.year) {
      // Ambas têm mês e ano
      if (current.month === cached.month &&
          current.year === cached.year) {
        score += 0.4;
      } else {
        score -= 0.4;
      }
    } else if (current.year && cached.year) {
      // Ambas têm pelo menos o ano
      if (current.year === cached.year) {
        score += 0.2;
      } else {
        score -= 0.2;
      }
    }
    totalFactors += 0.4;

    // Normalizar a pontuação para o intervalo [0, 1]
    const normalizedScore = totalFactors > 0 ? (score + totalFactors) / (2 * totalFactors) : 0.5;

    this.logger.debug(`[COMPAT] Pontuação bruta: ${score}, Total fatores: ${totalFactors}, Normalizada: ${normalizedScore}`);

    return normalizedScore;
  }

  private getBrazilianTimestamp(): string {
    // Cria um timestamp no fuso horário do Brasil (UTC-3)
    const now = new Date();
    // Ajusta para UTC-3 (Brasil)
    const brazilTime = new Date(now.getTime() - (3 * 60 * 60 * 1000));
    return brazilTime.toISOString();
  }

  async storeResult(
    question: string,
    result: ProcessingResult,
    conversationId?: string,
    context?: ConversationContext
  ): Promise<void> {
    try {
      this.logger.log(`[CACHE] Armazenando resultado para pergunta: "${question}"`);

      if (!this.pinecone) {
        this.logger.error('[CACHE] Cliente Pinecone não inicializado');
        throw new Error('Cliente Pinecone não inicializado');
      }

      // Gerar embedding para a pergunta
      const embedding = await this.generateEmbedding(question);

      // Obter o índice do Pinecone
      const indexName = this.configService.get<string>('PINECONE_INDEX');
      this.logger.debug(`[CACHE] Usando índice Pinecone: ${indexName}`);

      if (!indexName) {
        this.logger.error('[CACHE] Nome do índice Pinecone não configurado');
        throw new Error('Nome do índice Pinecone não configurado');
      }

      const index = this.pinecone.Index(indexName);

      // Extrair tópicos e entidades da pergunta
      const topics = extractTopics(question);
      const entities = extractEntities(question);

      // Combinar com o contexto fornecido
      const topicsList = [
        ...new Set([
          ...topics,
          ...(context?.topics || [])
        ])
      ];

      const entitiesList = [
        ...new Set([
          ...entities,
          ...(context?.entities || [])
        ])
      ];

      // Criar metadados para o registro
      const recordMetadata: PineconeMetadata = {
        question: question,
        response: result.message,
        query: result.metadata.sql,
        executionTimeMs: result.metadata.processingTimeMs,
        sourceTables: Array.isArray(result.metadata.tables) ? result.metadata.tables : [],
        createdAt: this.getBrazilianTimestamp(),
        updatedAt: this.getBrazilianTimestamp(),
        version: '1.0',
        feedbackPositive: 0,
        feedbackNegative: 0,
        feedbackComments: [],
        needsReview: false,
        usageCount: 1,
        lastUsedAt: this.getBrazilianTimestamp(),
        conversationTopics: topicsList,
        relatedEntities: entitiesList,
        conversationIds: conversationId ? [conversationId] : []
      };

      // Verificar se já existe um registro similar - busca sem filtros para garantir que encontremos correspondências exatas
      this.logger.debug(`[CACHE] Verificando se já existe um registro similar para a pergunta`);
      const queryResult = await index.query({
        vector: embedding,
        topK: 10, // Aumentar para ter mais chances de encontrar correspondências exatas
        includeMetadata: true,
      });

      // Extrair tópicos e entidades da pergunta
      const questionTopics = extractTopics(question);
      const questionEntities = extractEntities(question);

      // Combinar com o contexto fornecido
      const allTopics = [
        ...new Set([
          ...questionTopics,
          ...(context?.topics || [])
        ])
      ];

      const allEntities = [
        ...new Set([
          ...questionEntities,
          ...(context?.entities || [])
        ])
      ];

      // Se encontrou um registro com similaridade exata, atualizar
      const exactMatch = queryResult.matches?.find(match => {
        const metadata = match.metadata as unknown as PineconeMetadata;
        if (!metadata.question) return false;
        const isExactMatch = metadata.question.toLowerCase().trim() === question.toLowerCase().trim();
        if (isExactMatch) {
          this.logger.debug(`[CACHE] Encontrada correspondência exata de texto com ID: ${match.id}, score: ${match.score}`);
        }
        return isExactMatch;
      });

      if (exactMatch && exactMatch.score > 0.90) { // Reduzir o limiar para 0.90 para ser mais inclusivo
        this.logger.log(`[CACHE] Encontrada correspondência exata. Atualizando registro existente: ${exactMatch.id}`);

        const metadata = exactMatch.metadata as unknown as PineconeMetadata;

        // Preparar metadados atualizados
        const updatedMetadata: Partial<PineconeMetadata> = {
          ...metadata,
          response: result.message,
          query: result.metadata.sql,
          executionTimeMs: result.metadata.processingTimeMs,
          updatedAt: this.getBrazilianTimestamp(),
          // Atualizar metadados de contexto
          conversationTopics: allTopics,
          relatedEntities: allEntities,
          // Incrementar contador de uso e atualizar timestamp
          usageCount: (metadata.usageCount || 0) + 1,
          lastUsedAt: this.getBrazilianTimestamp(),
        };

        // Adicionar o conversationId atual à lista de conversationIds
        if (conversationId) {
          // Se já existe uma lista de conversationIds, adicione o novo
          if (metadata.conversationIds && Array.isArray(metadata.conversationIds)) {
            if (!metadata.conversationIds.includes(conversationId)) {
              // Manter apenas os 10 IDs mais recentes + o novo
              updatedMetadata.conversationIds = [
                conversationId,
                ...metadata.conversationIds.slice(0, 9)
              ];
              this.logger.debug(`[CACHE] Adicionando novo conversationId ${conversationId} à lista existente`);
            } else {
              // Se já estiver na lista, manter como está
              updatedMetadata.conversationIds = [...metadata.conversationIds];
              this.logger.debug(`[CACHE] ConversationId ${conversationId} já existe na lista, mantendo como está`);
            }
          } else {
            // Se não existe, crie uma nova lista
            updatedMetadata.conversationIds = [conversationId];
            this.logger.debug(`[CACHE] Criando nova lista de conversationIds com ${conversationId}`);
          }
        }

        // Atualizar registro no Pinecone
        try {
          await index.update({
            id: exactMatch.id,
            metadata: updatedMetadata,
          });
          this.logger.log(`[CACHE] Registro atualizado com sucesso: ${exactMatch.id}`);

          // Log detalhado para depuração
          this.logger.debug(`[CACHE] Detalhes do registro atualizado:
            - usageCount: ${updatedMetadata.usageCount}
            - conversationIds: ${JSON.stringify(updatedMetadata.conversationIds)}
            - lastUsedAt: ${updatedMetadata.lastUsedAt}
          `);
        } catch (updateError) {
          this.logger.error(`[CACHE] Erro ao atualizar registro ${exactMatch.id}: ${updateError instanceof Error ? updateError.message : String(updateError)}`);
        }

        return;
      }

      // Se não encontrou correspondência exata, criar novo registro
      const recordId = uuidv4();
      this.logger.log(`[CACHE] Criando novo registro com ID: ${recordId}`);

      // Preparar metadados para o novo registro
      const metadata: PineconeMetadata = {
        question,
        response: result.message,
        query: result.metadata.sql,
        executionTimeMs: result.metadata.processingTimeMs,
        createdAt: this.getBrazilianTimestamp(),
        updatedAt: this.getBrazilianTimestamp(),
        version: '1.0',
        feedbackPositive: 0,
        feedbackNegative: 0,
        feedbackComments: [],
        needsReview: false,
        conversationTopics: allTopics,
        relatedEntities: allEntities,
        // Inicializar contador de uso e timestamp
        usageCount: 1,
        lastUsedAt: this.getBrazilianTimestamp(),
        sourceTables: Array.isArray(result.metadata.tables) ? result.metadata.tables : []
      };

      // Adicionar conversationId se fornecido
      if (conversationId) {
        metadata.conversationIds = [conversationId];
        this.logger.debug(`[CACHE] Adicionando conversationId ${conversationId} ao novo registro`);
      }

      // Adicionar perguntas anteriores se fornecidas
      if (context?.previousQuestions && context.previousQuestions.length > 0) {
        metadata.previousQuestions = context.previousQuestions;
      }

      // Criar registro no Pinecone
      try {
        await index.upsert([
          {
            id: recordId,
            values: embedding,
            metadata,
          },
        ]);
        this.logger.log(`[CACHE] Template armazenado com sucesso: ${recordId}`);

        // Log detalhado para depuração
        this.logger.debug(`[CACHE] Detalhes do novo registro:
          - usageCount: ${metadata.usageCount}
          - conversationIds: ${JSON.stringify(metadata.conversationIds)}
          - lastUsedAt: ${metadata.lastUsedAt}
        `);
      } catch (upsertError) {
        this.logger.error(`[CACHE] Erro ao criar novo registro: ${upsertError instanceof Error ? upsertError.message : String(upsertError)}`);
        throw upsertError;
      }
    } catch (error) {
      this.logger.error(`[CACHE] Erro ao armazenar resultado: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  async updateFeedback(
    question: string,
    feedback: FeedbackData,
    conversationId?: string,
    context?: ConversationContext,
    recordId?: string
  ): Promise<void> {
    try {
      this.logger.log(`[FEEDBACK] Atualizando feedback para a pergunta: "${question}"`);

      if (!this.pinecone) {
        this.logger.error('[FEEDBACK] Cliente Pinecone não inicializado');
        throw new Error('Cliente Pinecone não inicializado');
      }

      // Obter o índice do Pinecone
      const indexName = this.configService.get<string>('PINECONE_INDEX');
      this.logger.debug(`[FEEDBACK] Usando índice Pinecone: ${indexName}`);

      if (!indexName) {
        this.logger.error('[FEEDBACK] Nome do índice Pinecone não configurado');
        throw new Error('Nome do índice Pinecone não configurado');
      }

      const index = this.pinecone.Index(indexName);
      let match: any = null;

      // Se temos o ID do registro, buscar diretamente
      if (recordId) {
        this.logger.debug(`[FEEDBACK] Buscando registro pelo ID: ${recordId}`);
        try {
          const fetchResponse = await index.fetch([recordId]);
          if (fetchResponse && fetchResponse.records && fetchResponse.records[recordId]) {
            match = {
              id: recordId,
              metadata: fetchResponse.records[recordId].metadata,
              score: 1.0 // Score máximo para busca direta por ID
            };
            this.logger.debug(`[FEEDBACK] Registro encontrado pelo ID: ${recordId}`);
          } else {
            this.logger.warn(`[FEEDBACK] Registro com ID ${recordId} não encontrado`);
          }
        } catch (error) {
          this.logger.warn(`[FEEDBACK] Erro ao buscar registro pelo ID ${recordId}: ${error instanceof Error ? error.message : String(error)}`);
        }
      }

      // Se não encontrou pelo ID ou não temos ID, buscar pelo embedding
      if (!match) {
        // Gerar embedding para a pergunta
        const embedding = await this.generateEmbedding(question);
        this.logger.debug(`[FEEDBACK] Buscando registro para atualizar feedback via embedding`);

        // Primeiro, tentar buscar por correspondência exata de texto sem filtros
        // Isso aumenta a chance de encontrar o registro correto
        this.logger.debug(`[FEEDBACK] Realizando busca sem filtros para encontrar correspondência exata`);
        const exactQueryResponse = await index.query({
          vector: embedding,
          topK: 20, // Aumentar para ter mais chances de encontrar
          includeMetadata: true
        });

        // Verificar correspondência exata de texto primeiro
        match = exactQueryResponse.matches?.find(m => {
          const metadata = m.metadata as unknown as PineconeMetadata;
          if (!metadata.question) return false;
          const isExactMatch = metadata.question?.toLowerCase().trim() === question.toLowerCase().trim();
          if (isExactMatch) {
            this.logger.debug(`[FEEDBACK] Encontrada correspondência exata de texto com ID: ${m.id}`);
          }
          return isExactMatch;
        });

        // Se não encontrou correspondência exata, tentar com filtros de contexto
        if (!match) {
          this.logger.debug(`[FEEDBACK] Nenhuma correspondência exata encontrada, tentando com filtros de contexto`);

          // Construir filtro de contexto se fornecido
          const contextFilter: Record<string, any> = {};

          if (context) {
            if (context.topics && context.topics.length > 0) {
              contextFilter.conversationTopics = { $in: context.topics };
            }

            if (context.entities && context.entities.length > 0) {
              contextFilter.relatedEntities = { $in: context.entities };
            }
          }

          // Se tiver conversationId, adicionar como filtro opcional
          if (conversationId) {
            // Buscar registros que tenham este conversationId na lista de conversationIds
            // OU que não tenham conversationIds definido (compatibilidade com registros antigos)
            contextFilter.$or = [
              { conversationIds: { $in: [conversationId] } },
              { conversationId: conversationId },
              { conversationIds: { $exists: false } }
            ];
          }

          // Buscar o registro mais similar
          const queryResponse = await index.query({
            vector: embedding,
            topK: 10, // Aumentar para ter mais chances de encontrar
            includeMetadata: true,
            filter: Object.keys(contextFilter).length > 0 ? contextFilter : undefined
          });

          // Verificar correspondência exata de texto primeiro
          match = queryResponse.matches?.find(m => {
            const metadata = m.metadata as unknown as PineconeMetadata;
            if (!metadata.question) return false;
            const isExactMatch = metadata.question?.toLowerCase().trim() === question.toLowerCase().trim();
            if (isExactMatch) {
              this.logger.debug(`[FEEDBACK] Encontrada correspondência exata de texto com filtros com ID: ${m.id}`);
            }
            return isExactMatch;
          });

          // Se não encontrou correspondência exata, usar a melhor correspondência
          if (!match && queryResponse.matches && queryResponse.matches.length > 0) {
            match = queryResponse.matches[0];
            this.logger.debug(`[FEEDBACK] Usando melhor correspondência com score ${match.score}`);
          }
        }
      }

      if (!match) {
        this.logger.warn(`[FEEDBACK] Nenhum registro encontrado para a pergunta: "${question}"`);
        return;
      }

      const metadata = match.metadata as unknown as PineconeMetadata;

      this.logger.debug(`[FEEDBACK] Registro encontrado com ID ${match.id} e score ${match.score || 'N/A'}`);

      // Atualizar contadores de feedback
      let feedbackPositive = metadata.feedbackPositive || 0;
      let feedbackNegative = metadata.feedbackNegative || 0;
      const feedbackComments = metadata.feedbackComments || [];

      // Determinar se precisa de revisão (quando feedback é negativo)
      const needsReview = feedback.type === 'negative' || !feedback.helpful;

      // Extrair categorias do comentário se existir
      let feedbackCategories = metadata.feedbackCategories || [];
      if (feedback.comment) {
        // Análise simples para extrair categorias do comentário
        const possibleCategories = ['sql', 'dados', 'formatação', 'performance', 'precisão', 'clareza'];
        const commentLower = feedback.comment.toLowerCase();

        const detectedCategories = possibleCategories.filter(category =>
          commentLower.includes(category)
        );

        if (detectedCategories.length > 0) {
          // Adicionar novas categorias sem duplicar
          feedbackCategories = [...new Set([...feedbackCategories, ...detectedCategories])];
          this.logger.debug(`[FEEDBACK] Categorias detectadas: ${detectedCategories.join(', ')}`);
        }
      }

      // Incrementar contador apropriado
      if (feedback.type === 'positive' || feedback.helpful) {
        feedbackPositive += 1;
        this.logger.debug(`[FEEDBACK] Incrementando feedback positivo para ${feedbackPositive}`);
      } else if (feedback.type === 'negative' || !feedback.helpful) {
        feedbackNegative += 1;
        this.logger.debug(`[FEEDBACK] Incrementando feedback negativo para ${feedbackNegative}`);
      }

      // Adicionar comentário se fornecido
      if (feedback.comment) {
        feedbackComments.push(feedback.comment);
        this.logger.debug(`[FEEDBACK] Adicionando comentário: "${feedback.comment}"`);
      }

      // Atualizar metadados
      const updatedMetadata: Partial<PineconeMetadata> = {
        feedbackPositive,
        feedbackNegative,
        feedbackComments,
        feedbackCategories,
        needsReview,
        lastFeedbackDate: this.getBrazilianTimestamp(),
        updatedAt: this.getBrazilianTimestamp(),
      };

      // Atualizar contexto se fornecido
      if (context) {
        if (context.topics && context.topics.length > 0) {
          updatedMetadata.conversationTopics = context.topics;
        }

        if (context.entities && context.entities.length > 0) {
          updatedMetadata.relatedEntities = context.entities;
        }

        if (context.previousQuestions && context.previousQuestions.length > 0) {
          updatedMetadata.previousQuestions = context.previousQuestions;
        }
      }

      // Adicionar o conversationId atual à lista de conversationIds
      if (conversationId) {
        // Se já existe uma lista de conversationIds, adicione o novo
        if (metadata.conversationIds && Array.isArray(metadata.conversationIds)) {
          if (!metadata.conversationIds.includes(conversationId)) {
            // Manter apenas os 10 IDs mais recentes + o novo
            updatedMetadata.conversationIds = [
              conversationId,
              ...metadata.conversationIds.slice(0, 9)
            ];
            this.logger.debug(`[FEEDBACK] Adicionando novo conversationId ${conversationId} à lista existente`);
          } else {
            // Se já estiver na lista, manter como está
            this.logger.debug(`[FEEDBACK] ConversationId ${conversationId} já existe na lista, mantendo como está`);
          }
        } else {
          // Se não existe, crie uma nova lista
          updatedMetadata.conversationIds = [conversationId];
          this.logger.debug(`[FEEDBACK] Criando nova lista de conversationIds com ${conversationId}`);
        }
      }

      // Atualizar registro no Pinecone
      try {
        await index.update({
          id: match.id,
          metadata: updatedMetadata,
        });
        this.logger.log(`[FEEDBACK] Feedback atualizado com sucesso para o registro ${match.id}`);

        // Log detalhado para depuração
        this.logger.debug(`[FEEDBACK] Detalhes do registro atualizado:
          - feedbackPositive: ${updatedMetadata.feedbackPositive}
          - feedbackNegative: ${updatedMetadata.feedbackNegative}
          - conversationIds: ${JSON.stringify(updatedMetadata.conversationIds || metadata.conversationIds)}
          - updatedAt: ${updatedMetadata.updatedAt}
        `);
      } catch (updateError) {
        this.logger.error(`[FEEDBACK] Erro ao atualizar registro ${match.id}: ${updateError instanceof Error ? updateError.message : String(updateError)}`);
        throw updateError;
      }
    } catch (error) {
      this.logger.error(`[FEEDBACK] Erro ao atualizar feedback: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  private async generateEmbedding(text: string): Promise<number[]> {
    try {
      const embeddings = await this.embeddings.embedQuery(text);
      return embeddings;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      this.logger.error('Erro ao gerar embedding:', {
        error: errorMessage,
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw error;
    }
  }

  async checkHealth(): Promise<HealthStatus> {
    try {
      const startTime = Date.now();
      const indexName = this.configService.get<string>('PINECONE_INDEX');

      if (!indexName) {
        this.logger.error('Nome do índice do Pinecone não encontrado nas variáveis de ambiente');
        return {
          status: 'error',
          latency: -1
        };
      }

      this.logger.debug(`Verificando saúde do índice: ${indexName}`);
      const index = this.pinecone.Index(indexName);
      await index.describeIndexStats();
      const latency = Date.now() - startTime;

      return {
        status: 'ok',
        latency
      };
    } catch (error) {
      return {
        status: 'error',
        latency: -1
      };
    }
  }

  async listTemplates(type?: string, minConfidence?: number): Promise<Template[]> {
    try {
      this.logger.log(`[TEMPLATES] Listando templates${type ? ` do tipo ${type}` : ''}${minConfidence ? ` com confiança mínima ${minConfidence}` : ''}`);

      if (!this.pinecone) {
        this.logger.error('[TEMPLATES] Cliente Pinecone não inicializado');
        throw new Error('Cliente Pinecone não inicializado');
      }

      // Obter o índice do Pinecone
      const indexName = this.configService.get<string>('PINECONE_INDEX');
      if (!indexName) {
        this.logger.error('[TEMPLATES] Nome do índice Pinecone não configurado');
        throw new Error('Nome do índice Pinecone não configurado');
      }

      const index = this.pinecone.Index(indexName);

      // Construir filtro
      const filter: Record<string, any> = {};
      if (type) {
        filter.type = type;
      }

      if (minConfidence) {
        filter.confidence = { $gte: minConfidence };
      }

      // Buscar registros
      const queryResponse = await index.query({
        vector: new Array(1536).fill(0), // Vetor dummy para busca
        topK: 100, // Limite máximo de registros
        includeMetadata: true,
        filter: Object.keys(filter).length > 0 ? filter : undefined,
      });

      // Converter para o formato Template
      const templates: Template[] = queryResponse.matches?.map(match => {
        const metadata = match.metadata as unknown as PineconeMetadata;
        return {
          id: match.id,
          question: metadata.question || '',
          sql: metadata.query || '',
          usage: {
            hits: metadata.usageCount || 0,
            lastUsed: metadata.lastUsedAt || metadata.updatedAt || metadata.createdAt,
          },
          feedback: {
            positive: metadata.feedbackPositive || 0,
            negative: metadata.feedbackNegative || 0,
            comments: metadata.feedbackComments || [],
            needsReview: metadata.needsReview || false,
            categories: metadata.feedbackCategories || [],
            lastFeedbackDate: metadata.lastFeedbackDate || metadata.updatedAt,
          },
        };
      }) || [];

      return templates;
    } catch (error) {
      this.logger.error(`[TEMPLATES] Erro ao listar templates: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  async updateTemplate(id: string, template: TemplateUpdateRequest): Promise<Template> {
    try {
      this.logger.log(`[TEMPLATE] Iniciando atualização do template com ID: ${id}`);

      if (!this.pinecone) {
        this.logger.error('[TEMPLATE] Cliente Pinecone não inicializado');
        throw new Error('Cliente Pinecone não inicializado');
      }

      // Obter o índice do Pinecone
      const indexName = this.configService.get<string>('PINECONE_INDEX');
      if (!indexName) {
        this.logger.error('[TEMPLATE] Nome do índice Pinecone não configurado');
        throw new Error('Nome do índice Pinecone não configurado');
      }

      const index = this.pinecone.Index(indexName);

      // Buscar o registro existente
      const fetchResult = await index.fetch([id]);
      if (!fetchResult.records || !fetchResult.records[id]) {
        this.logger.error(`[TEMPLATE] Template com ID ${id} não encontrado`);
        throw new Error(`Template com ID ${id} não encontrado`);
      }

      const existingRecord = fetchResult.records[id];
      const existingMetadata = existingRecord.metadata as unknown as PineconeMetadata;

      // Extrair tópicos e entidades da pergunta atualizada
      const questionTopics: string[] = [];
      const questionEntities: string[] = [];

      // Combinar com o contexto existente
      const updatedTopics = [
        ...new Set([
          ...questionTopics,
          ...(existingMetadata.conversationTopics || [])
        ])
      ];

      const updatedEntities = [
        ...new Set([
          ...questionEntities,
          ...(existingMetadata.relatedEntities || [])
        ])
      ];

      // Preparar metadados para o novo registro
      const updatedMetadata: PineconeMetadata = {
        question: existingMetadata.question,
        response: template.response || existingMetadata.response,
        query: template.sql || existingMetadata.query,
        executionTimeMs: existingMetadata.executionTimeMs,
        sourceTables: existingMetadata.sourceTables || [],
        createdAt: existingMetadata.createdAt,
        updatedAt: this.getBrazilianTimestamp(),
        version: '1.0',
        feedbackPositive: existingMetadata.feedbackPositive || 0,
        feedbackNegative: existingMetadata.feedbackNegative || 0,
        feedbackComments: existingMetadata.feedbackComments || [],
        needsReview: existingMetadata.needsReview || false,
        usageCount: existingMetadata.usageCount || 0,
        lastUsedAt: existingMetadata.lastUsedAt || existingMetadata.updatedAt || existingMetadata.createdAt,
        conversationTopics: updatedTopics,
        relatedEntities: updatedEntities,
        conversationIds: existingMetadata.conversationIds || []
      };

      if (template.metadata) {
        if (template.metadata.confidence) {
          updatedMetadata.confidence = template.metadata.confidence;
        }

        if (template.metadata.ttl) {
          // Converter TTL para data
          const ttlDate = new Date();
          ttlDate.setDate(ttlDate.getDate() + parseInt(template.metadata.ttl.toString(), 10));
          updatedMetadata.ttl = ttlDate.toISOString();
        }
      }

      // Atualizar registro no Pinecone
      await index.update({
        id,
        metadata: updatedMetadata,
      });

      // Retornar o template atualizado
      return {
        id,
        question: existingMetadata.question || '',
        sql: updatedMetadata.query || existingMetadata.query || '',
        usage: {
          hits: existingMetadata.usageCount || 0,
          lastUsed: existingMetadata.lastUsedAt || existingMetadata.updatedAt || existingMetadata.createdAt,
        },
        feedback: {
          positive: existingMetadata.feedbackPositive || 0,
          negative: existingMetadata.feedbackNegative || 0,
          comments: existingMetadata.feedbackComments || [],
          needsReview: existingMetadata.needsReview || false,
          categories: existingMetadata.feedbackCategories || [],
          lastFeedbackDate: existingMetadata.lastFeedbackDate || existingMetadata.updatedAt,
        },
      };
    } catch (error) {
      this.logger.error(`[TEMPLATES] Erro ao atualizar template: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  async deleteTemplate(id: string): Promise<void> {
    try {
      const indexName = this.configService.get<string>('PINECONE_INDEX');

      if (!indexName) {
        this.logger.error('Nome do índice do Pinecone não encontrado nas variáveis de ambiente');
        throw new Error('Nome do índice do Pinecone não encontrado');
      }

      this.logger.debug(`Excluindo template ${id} do índice: ${indexName}`);
      const index = this.pinecone.Index(indexName);

      await index.deleteOne(id);
      this.logger.debug(`Template ${id} excluído com sucesso`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      this.logger.error(`Erro ao excluir template ${id}:`, {
        error: errorMessage,
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw error;
    }
  }

  async deleteRecord(id: string): Promise<boolean> {
    try {
      this.logger.log(`[DELETE] Excluindo registro com ID: ${id}`);

      if (!this.pinecone) {
        this.logger.error('[DELETE] Cliente Pinecone não inicializado');
        throw new Error('Cliente Pinecone não inicializado');
      }

      const index = this.pinecone.Index(this.configService.get<string>('PINECONE_INDEX') || 'gptrue');

      await index.deleteOne(id);

      this.logger.log(`[DELETE] Registro ${id} excluído com sucesso`);
      return true;
    } catch (error) {
      this.logger.error(`[DELETE] Erro ao excluir registro: ${error instanceof Error ? error.message : String(error)}`);
      return false;
    }
  }

  async clearCache(options: CacheClearOptions): Promise<CacheClearResult> {
    try {
      const indexName = this.configService.get<string>('PINECONE_INDEX');

      if (!indexName) {
        this.logger.error('Nome do índice do Pinecone não encontrado nas variáveis de ambiente');
        throw new Error('Nome do índice do Pinecone não encontrado');
      }

      this.logger.debug(`Limpando cache do índice: ${indexName}`);
      const index = this.pinecone.Index(indexName);

      // Buscar templates que correspondem aos critérios
      let filter: Record<string, any> = {};

      if (options.olderThan) {
        filter.createdAt = { $lt: new Date(options.olderThan).toISOString() };
      }

      if (options.type) {
        filter.query = { $text: { $search: options.type } };
      }

      if (options.minConfidence !== undefined) {
        // Não é possível filtrar diretamente por confiança no Pinecone
        // Vamos buscar todos e filtrar depois
      }

      // Buscar IDs de templates que correspondem aos critérios
      const queryResult = await index.query({
        vector: new Array(1536).fill(0), // Dummy vector
        topK: 10000,
        includeMetadata: true,
        filter: Object.keys(filter).length > 0 ? filter : undefined,
      });

      // Filtrar por confiança se necessário
      let matchesToDelete = queryResult.matches;

      if (options.minConfidence !== undefined) {
        matchesToDelete = matchesToDelete.filter(match => {
          const metadata = match.metadata as PineconeMetadata;
          const totalFeedback = metadata.feedbackPositive + metadata.feedbackNegative;
          if (totalFeedback === 0) return true; // Sem feedback, considerar como baixa confiança
          const confidence = metadata.feedbackPositive / totalFeedback;
          return confidence < options.minConfidence;
        });
      }

      // Excluir templates
      const idsToDelete = matchesToDelete.map(match => match.id);

      if (idsToDelete.length === 0) {
        return {
          clearedTemplates: 0,
          affectedQueries: 0,
          timestamp: this.getBrazilianTimestamp()
        };
      }

      // Excluir em lotes de 100 para evitar problemas com limites da API
      const batchSize = 100;
      for (let i = 0; i < idsToDelete.length; i += batchSize) {
        const batch = idsToDelete.slice(i, i + batchSize);
        await index.deleteMany(batch);
      }

      this.logger.debug(`Cache limpo com sucesso: ${idsToDelete.length} templates removidos`);

      return {
        clearedTemplates: idsToDelete.length,
        affectedQueries: idsToDelete.length,
        timestamp: this.getBrazilianTimestamp()
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      this.logger.error('Erro ao limpar cache:', {
        error: errorMessage,
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw error;
    }
  }

  async checkConnection(): Promise<boolean> {
    try {
      const health = await this.checkHealth();
      return health.status === 'ok';
    } catch (error) {
      this.logger.error('Erro ao verificar conexão com Pinecone:', {
        error: error instanceof Error ? error.message : 'Erro desconhecido',
        stack: error instanceof Error ? error.stack : undefined,
      });
      return false;
    }
  }

  /**
   * Verifica se as entidades principais são as mesmas nas duas perguntas
   * @param currentQuestion Pergunta atual
   * @param cachedQuestion Pergunta em cache
   * @returns true se as entidades principais são as mesmas
   */
  private checkEntitiesMatch(currentQuestion: string, cachedQuestion: string): boolean {
    // Extrair estrutura das perguntas
    const currentInfo = this.extractQueryStructure(currentQuestion.toLowerCase().trim());
    const cachedInfo = this.extractQueryStructure(cachedQuestion.toLowerCase().trim());

    // Verificar se o período (mês/ano) é o mesmo
    if (currentInfo.month && cachedInfo.month &&
        currentInfo.year && cachedInfo.year) {
      // Se ambas têm mês e ano, verificar se são iguais
      if (currentInfo.month !== cachedInfo.month ||
          currentInfo.year !== cachedInfo.year) {
        this.logger.debug(`[ENTITIES] Períodos diferentes: ${currentInfo.month}/${currentInfo.year} vs ${cachedInfo.month}/${cachedInfo.year}`);
        return false;
      }

      this.logger.debug(`[ENTITIES] Períodos iguais: ${currentInfo.month}/${currentInfo.year}`);
      return true;
    }

    // Se uma tem mês e ano e a outra não, verificar apenas o ano
    if (currentInfo.year && cachedInfo.year) {
      if (currentInfo.year === cachedInfo.year) {
        this.logger.debug(`[ENTITIES] Anos iguais: ${currentInfo.year}`);
        return true;
      } else {
        this.logger.debug(`[ENTITIES] Anos diferentes: ${currentInfo.year} vs ${cachedInfo.year}`);
        return false;
      }
    }

    // Se nenhuma tem mês e ano, considerar que as entidades são as mesmas
    // Isso é uma simplificação - em um sistema real, faríamos verificações adicionais
    this.logger.debug(`[ENTITIES] Nenhuma das perguntas tem período definido`);
    return true;
  }
}
