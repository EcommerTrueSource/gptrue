import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue, Job } from 'bullmq';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class QueueService {
  private readonly logger = new Logger(QueueService.name);

  constructor(
    @InjectQueue('query-processing') private queryProcessingQueue: Queue,
    @InjectQueue('response-generation') private responseGenerationQueue: Queue,
  ) {}

  /**
   * Adiciona um job para processamento de consulta
   * @param data Dados para processamento
   * @returns ID do job
   */
  async addQueryProcessingJob(data: any): Promise<string> {
    try {
      const jobId = uuidv4();
      await this.queryProcessingQueue.add('process-query', data, {
        jobId,
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 1000,
        },
      });
      this.logger.log(`Job de processamento de consulta adicionado: ${jobId}`);
      return jobId;
    } catch (error: any) {
      this.logger.error(`Erro ao adicionar job de processamento: ${error.message}`, error.stack);
      throw new Error(`Erro ao adicionar job de processamento: ${error.message}`);
    }
  }

  /**
   * Adiciona um job para geração de resposta
   * @param data Dados para geração
   * @returns ID do job
   */
  async addResponseGenerationJob(data: any): Promise<string> {
    try {
      const jobId = uuidv4();
      await this.responseGenerationQueue.add('generate-response', data, {
        jobId,
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 1000,
        },
      });
      this.logger.log(`Job de geração de resposta adicionado: ${jobId}`);
      return jobId;
    } catch (error: any) {
      this.logger.error(`Erro ao adicionar job de geração: ${error.message}`, error.stack);
      throw new Error(`Erro ao adicionar job de geração: ${error.message}`);
    }
  }

  /**
   * Obtém o status de um job
   * @param queueName Nome da fila
   * @param jobId ID do job
   * @returns Status do job
   */
  async getJobStatus(queueName: 'query-processing' | 'response-generation', jobId: string): Promise<any> {
    try {
      const queue = queueName === 'query-processing' ? this.queryProcessingQueue : this.responseGenerationQueue;
      const job = await queue.getJob(jobId);
      
      if (!job) {
        return { status: 'not_found' };
      }

      const state = await job.getState();
      const progress = job.progress;
      const result = job.returnvalue;
      const error = job.failedReason;

      return {
        id: job.id,
        status: state,
        progress,
        result,
        error,
      };
    } catch (error: any) {
      this.logger.error(`Erro ao obter status do job: ${error.message}`, error.stack);
      return { status: 'error', message: error.message };
    }
  }

  /**
   * Cancela um job
   * @param queueName Nome da fila
   * @param jobId ID do job
   * @returns Confirmação de cancelamento
   */
  async cancelJob(queueName: 'query-processing' | 'response-generation', jobId: string): Promise<boolean> {
    try {
      const queue = queueName === 'query-processing' ? this.queryProcessingQueue : this.responseGenerationQueue;
      const job = await queue.getJob(jobId);
      
      if (!job) {
        return false;
      }

      await job.remove();
      this.logger.log(`Job cancelado: ${jobId}`);
      return true;
    } catch (error: any) {
      this.logger.error(`Erro ao cancelar job: ${error.message}`, error.stack);
      return false;
    }
  }
} 