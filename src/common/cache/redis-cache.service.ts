import { Inject, Injectable, Logger } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';

@Injectable()
export class RedisCacheService {
  private readonly logger = new Logger(RedisCacheService.name);
  private readonly defaultTTL = 3600; // 1 hora em segundos

  constructor(@Inject(CACHE_MANAGER) private cacheManager: Cache) {}

  /**
   * Obtém um valor do cache
   * @param key Chave do cache
   * @returns Valor armazenado ou null se não encontrado
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      const value = await this.cacheManager.get<T>(key);
      return value || null;
    } catch (error: unknown) {
      const err = error as Error;
      this.logger.error(
        `Erro ao obter valor do cache: ${err.message}`,
        err.stack,
      );
      return null;
    }
  }

  /**
   * Armazena um valor no cache
   * @param key Chave do cache
   * @param value Valor a ser armazenado
   * @param ttl Tempo de vida em segundos (opcional)
   * @returns Confirmação de armazenamento
   */
  async set(key: string, value: unknown, ttl: number = this.defaultTTL): Promise<boolean> {
    try {
      await this.cacheManager.set(key, value, ttl);
      return true;
    } catch (error: unknown) {
      const err = error as Error;
      this.logger.error(`Erro ao armazenar valor no cache: ${err.message}`, err.stack);
      return false;
    }
  }

  /**
   * Remove um valor do cache
   * @param key Chave do cache
   * @returns Confirmação de remoção
   */
  async del(key: string): Promise<boolean> {
    try {
      await this.cacheManager.del(key);
      return true;
    } catch (error: unknown) {
      const err = error as Error;
      this.logger.error(`Erro ao remover valor do cache: ${err.message}`, err.stack);
      return false;
    }
  }

  /**
   * Verifica se uma chave existe no cache
   * @param key Chave do cache
   * @returns Verdadeiro se a chave existir
   */
  async has(key: string): Promise<boolean> {
    try {
      const value = await this.cacheManager.get(key);
      return value !== undefined && value !== null;
    } catch (error: unknown) {
      const err = error as Error;
      this.logger.error(`Erro ao verificar existência no cache: ${err.message}`, err.stack);
      return false;
    }
  }

  /**
   * Limpa todo o cache
   * @returns Confirmação de limpeza
   */
  async reset(): Promise<boolean> {
    try {
      await this.cacheManager.reset();
      return true;
    } catch (error: unknown) {
      const err = error as Error;
      this.logger.error(`Erro ao limpar cache: ${err.message}`, err.stack);
      return false;
    }
  }

  /**
   * Obtém múltiplos valores do cache
   * @param keys Lista de chaves
   * @returns Mapa de valores encontrados
   */
  async mget<T>(keys: string[]): Promise<Map<string, T>> {
    try {
      const result = new Map<string, T>();

      // Executar em paralelo para melhor performance
      const promises = keys.map(async key => {
        const value = await this.cacheManager.get<T>(key);
        if (value !== undefined && value !== null) {
          result.set(key, value);
        }
      });

      await Promise.all(promises);
      return result;
    } catch (error: unknown) {
      const err = error as Error;
      this.logger.error(`Erro ao obter múltiplos valores do cache: ${err.message}`, err.stack);
      return new Map<string, T>();
    }
  }

  /**
   * Armazena múltiplos valores no cache
   * @param entries Mapa de chaves e valores
   * @param ttl Tempo de vida em segundos (opcional)
   * @returns Confirmação de armazenamento
   */
  async mset(entries: Map<string, unknown>, ttl: number = this.defaultTTL): Promise<boolean> {
    try {
      // Executar em paralelo para melhor performance
      const promises = Array.from(entries.entries()).map(async ([key, value]) => {
        await this.cacheManager.set(key, value, ttl);
      });

      await Promise.all(promises);
      return true;
    } catch (error: unknown) {
      const err = error as Error;
      this.logger.error(
        `Erro ao armazenar múltiplos valores no cache: ${err.message}`,
        err.stack,
      );
      return false;
    }
  }
}
