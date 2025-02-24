import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PineconeClient } from '@pinecone-database/pinecone';
import { CacheTemplate } from './interfaces/pinecone.interface';

@Injectable()
export class PineconeService implements OnModuleInit {
  private readonly logger = new Logger(PineconeService.name);
  private pinecone: PineconeClient;
  private indexName: string;
  private namespace: string;
  private dimension: number;
  private ttlEnabled: boolean;
  private ttlDays: number;

  constructor(private configService: ConfigService) {
    this.pinecone = new PineconeClient();
    this.indexName = this.configService.get<string>('pinecone.indexName') || 'gptrue-index';
    this.namespace = this.configService.get<string>('pinecone.namespace') || 'default';
    this.dimension = this.configService.get<number>('pinecone.dimension') || 1536;
    this.ttlEnabled = this.configService.get<boolean>('pinecone.ttl.enabled') || false;
    this.ttlDays = this.configService.get<number>('pinecone.ttl.days') || 30;
  }

  async onModuleInit() {
    await this.initializePinecone();
  }

  /**
   * Inicializa o cliente Pinecone
   */
  private async initializePinecone() {
    try {
      await this.pinecone.init({
        environment: this.configService.get<string>('pinecone.environment') || 'us-west1-gcp',
        apiKey: this.configService.get<string>('pinecone.apiKey') || '',
      });
      this.logger.log('Pinecone inicializado com sucesso');
    } catch (error) {
      this.logger.error(`Erro ao inicializar Pinecone: ${error.message}`, error.stack);
      throw new Error(`Erro ao inicializar Pinecone: ${error.message}`);
    }
  }

  /**
   * Insere um template no Pinecone
   * @param template Template a ser inserido
   * @returns ID do template inserido
   */
  async upsertTemplate(template: CacheTemplate): Promise<string> {
    try {
      const index = this.pinecone.Index(this.indexName);
      
      const metadata = {
        question: template.question,
        query: template.query || '',
        response: template.response,
        createdAt: template.metadata.createdAt.toISOString(),
        updatedAt: template.metadata.updatedAt.toISOString(),
        version: template.metadata.version,
        executionTimeMs: template.metadata.executionTimeMs,
        sourceTables: template.metadata.sourceTables.join(','),
        positive: template.feedback.positive,
        negative: template.feedback.negative,
        needsReview: template.feedback.needsReview,
      };

      // Adicionar TTL se habilitado
      const ttl = this.ttlEnabled 
        ? new Date(Date.now() + this.ttlDays * 24 * 60 * 60 * 1000) 
        : undefined;

      await index.upsert({
        upsertRequest: {
          vectors: [
            {
              id: template.id,
              values: template.questionEmbedding,
              metadata,
              ...(ttl && { ttl }),
            },
          ],
          namespace: this.namespace,
        },
      });

      this.logger.log(`Template inserido com sucesso: ${template.id}`);
      return template.id;
    } catch (error) {
      this.logger.error(`Erro ao inserir template no Pinecone: ${error.message}`, error.stack);
      throw new Error(`Erro ao inserir template no Pinecone: ${error.message}`);
    }
  }

  /**
   * Busca templates similares no Pinecone
   * @param embedding Embedding da pergunta
   * @param similarityThreshold Limiar de similaridade
   * @param topK Número máximo de resultados
   * @returns Templates similares
   */
  async findSimilarTemplates(
    embedding: number[],
    similarityThreshold: number = 0.85,
    topK: number = 1,
  ): Promise<{ id: string; score: number; metadata: any }[]> {
    try {
      const index = this.pinecone.Index(this.indexName);
      
      const queryResponse = await index.query({
        queryRequest: {
          vector: embedding,
          topK,
          includeMetadata: true,
          namespace: this.namespace,
        },
      });

      // Filtrar por similaridade
      const matches = queryResponse.matches
        ?.filter(match => match.score && match.score >= similarityThreshold)
        .map(match => ({
          id: match.id,
          score: match.score || 0,
          metadata: match.metadata,
        })) || [];

      this.logger.debug(`Encontrados ${matches.length} templates similares`);
      return matches;
    } catch (error) {
      this.logger.error(`Erro ao buscar templates similares: ${error.message}`, error.stack);
      throw new Error(`Erro ao buscar templates similares: ${error.message}`);
    }
  }

  /**
   * Atualiza um template no Pinecone
   * @param id ID do template
   * @param updates Atualizações a serem aplicadas
   * @returns Confirmação de atualização
   */
  async updateTemplate(id: string, updates: Partial<CacheTemplate>): Promise<boolean> {
    try {
      // Buscar o template atual
      const index = this.pinecone.Index(this.indexName);
      const fetchResponse = await index.fetch({
        ids: [id],
        namespace: this.namespace,
      });

      if (!fetchResponse.vectors?.[id]) {
        throw new Error(`Template não encontrado: ${id}`);
      }

      // Extrair metadados atuais
      const currentMetadata = fetchResponse.vectors[id].metadata;
      
      // Mesclar com atualizações
      const updatedMetadata = {
        ...currentMetadata,
        updatedAt: new Date().toISOString(),
        ...(updates.feedback && {
          positive: updates.feedback.positive,
          negative: updates.feedback.negative,
          needsReview: updates.feedback.needsReview,
        }),
      };

      // Atualizar no Pinecone
      await index.update({
        updateRequest: {
          id: id,
          setMetadata: updatedMetadata,
          namespace: this.namespace,
        }
      });

      this.logger.log(`Template atualizado com sucesso: ${id}`);
      return true;
    } catch (error) {
      this.logger.error(`Erro ao atualizar template: ${error.message}`, error.stack);
      return false;
    }
  }

  /**
   * Exclui um template do Pinecone
   * @param id ID do template
   * @returns Confirmação de exclusão
   */
  async deleteTemplate(id: string): Promise<boolean> {
    try {
      const index = this.pinecone.Index(this.indexName);
      
      await index._delete({
        deleteRequest: {
          ids: [id],
          namespace: this.namespace,
        }
      });

      this.logger.log(`Template excluído com sucesso: ${id}`);
      return true;
    } catch (error) {
      this.logger.error(`Erro ao excluir template: ${error.message}`, error.stack);
      return false;
    }
  }
} 