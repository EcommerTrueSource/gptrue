import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BigQuery } from '@google-cloud/bigquery';

@Injectable()
export class BigQueryService {
  private bigquery: BigQuery;

  constructor(private configService: ConfigService) {
    this.bigquery = new BigQuery({
      projectId: this.configService.get<string>('BIGQUERY_PROJECT_ID'),
      keyFilename: this.configService.get<string>('BIGQUERY_KEY_FILE'),
    });
  }

  async validateQuery(query: string): Promise<{
    isValid: boolean;
    errors?: string[];
    estimatedCost?: {
      bytesProcessed: number;
      estimatedExecutionTimeMs: number;
    };
  }> {
    try {
      // Verifica se a query contém operações de modificação
      const queryUpperCase = query.toUpperCase();
      if (
        queryUpperCase.includes('INSERT') ||
        queryUpperCase.includes('UPDATE') ||
        queryUpperCase.includes('DELETE') ||
        queryUpperCase.includes('DROP') ||
        queryUpperCase.includes('CREATE')
      ) {
        return {
          isValid: false,
          errors: ['Operações de modificação não são permitidas'],
        };
      }

      // Verifica acesso a tabelas permitidas
      const allowedTables = ['PEDIDOS', 'PRODUTOS', 'ASSINATURA', 'CLIENTES', 'STATUS_ASSINANTES'];
      const tablePattern = /FROM\s+([a-zA-Z_][a-zA-Z0-9_]*)/g;
      const tables = [...query.matchAll(tablePattern)].map(match => match[1].toUpperCase());

      const unauthorizedTables = tables.filter(table => !allowedTables.includes(table));
      if (unauthorizedTables.length > 0) {
        return {
          isValid: false,
          errors: ['Acesso não autorizado à tabela'],
        };
      }

      // Verifica sintaxe e estima custos
      const [job] = await this.bigquery.createQueryJob({
        query,
        dryRun: true,
      });

      const estimatedCost = {
        bytesProcessed: job.metadata.statistics.totalBytesProcessed,
        estimatedExecutionTimeMs: job.metadata.statistics.estimatedExecutionTimeMs,
      };

      // Verifica limites de recursos
      const maxBytes = parseInt(this.configService.get('MAX_QUERY_COST_BYTES') || '1000000000');
      const maxExecutionTime = parseInt(this.configService.get('MAX_QUERY_EXECUTION_TIME') || '30') * 1000;

      if (estimatedCost.bytesProcessed > maxBytes || estimatedCost.estimatedExecutionTimeMs > maxExecutionTime) {
        return {
          isValid: false,
          errors: ['Query excede o limite de recursos'],
          estimatedCost,
        };
      }

      return {
        isValid: true,
        estimatedCost,
      };
    } catch (error: any) {
      if (error.message?.includes('Syntax error')) {
        return {
          isValid: false,
          errors: ['Erro de sintaxe SQL'],
        };
      }

      throw new Error(`Erro ao validar query: ${error.message || 'Erro desconhecido'}`);
    }
  }
}
