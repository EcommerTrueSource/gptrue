import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BigQuery, Job } from '@google-cloud/bigquery';
import { GeneratedQuery } from '../../query-generator/interfaces/query-generator.interface';
import {
  ValidationResult,
  ValidationError,
  ValidationWarning,
  QueryResult,
  SecurityPolicy,
} from '../interfaces/query-validator.interface';
import { DEFAULT_SECURITY_POLICY } from '../constants/security-policies';

@Injectable()
export class QueryValidatorService {
  private readonly logger = new Logger(QueryValidatorService.name);
  private readonly bigquery: BigQuery;
  private readonly securityPolicy: SecurityPolicy;

  constructor(private readonly configService: ConfigService) {
    this.bigquery = new BigQuery({
      projectId: this.configService.get<string>('bigquery.projectId'),
      keyFilename: this.configService.get<string>('bigquery.keyFilename'),
    });

    this.securityPolicy = DEFAULT_SECURITY_POLICY;
  }

  async validateQuery(query: GeneratedQuery): Promise<ValidationResult> {
    try {
      const errors: ValidationError[] = [];
      const warnings: ValidationWarning[] = [];

      // Validar sintaxe
      const syntaxValidation = await this.validateSyntax(query.sql);
      if (!syntaxValidation.isValid) {
        return syntaxValidation;
      }

      // Validar políticas de segurança
      const securityValidation = this.validateSecurity(query);
      if (!securityValidation.isValid) {
        return securityValidation;
      }

      // Estimar custos
      const costEstimate = await this.estimateQueryCost(query.sql);

      // Verificar otimizações possíveis
      const optimizations = await this.analyzeOptimizations(query);

      return {
        isValid: true,
        warnings,
        estimatedCost: costEstimate,
        optimizations,
      };
    } catch (error) {
      this.logger.error(`Erro ao validar consulta: ${error.message}`, error.stack);
      throw error;
    }
  }

  async executeQuery(sql: string): Promise<QueryResult> {
    try {
      const [job] = await this.bigquery.createQueryJob({
        query: sql,
        location: this.configService.get<string>('bigquery.location'),
        maximumBytesBilled: this.configService.get<string>('bigquery.maxBytesProcessed'),
        useQueryCache: true,
      });

      const [rows, metadata] = await job.getQueryResults();
      const stats = job.metadata.statistics;

      return {
        data: rows,
        metadata: {
          schema: metadata.schema.fields.map(field => ({
            name: field.name,
            type: field.type,
            mode: field.mode,
            description: field.description,
          })),
          totalRows: parseInt(stats.query.numDmlAffectedRows || '0', 10),
          processingTime: `${stats.query.totalSlotMs}ms`,
          bytesProcessed: parseInt(stats.query.totalBytesBilled || '0', 10),
          cacheHit: stats.query.cacheHit || false,
        },
      };
    } catch (error) {
      this.logger.error(`Erro ao executar consulta: ${error.message}`, error.stack);
      throw error;
    }
  }

  private async validateSyntax(sql: string): Promise<ValidationResult> {
    try {
      const [job] = await this.bigquery.createQueryJob({
        query: sql,
        dryRun: true,
      });

      return { isValid: true };
    } catch (error) {
      return {
        isValid: false,
        errors: [{
          code: 'SYNTAX_ERROR',
          message: error.message,
          severity: 'error',
        }],
      };
    }
  }

  private validateSecurity(query: GeneratedQuery): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Verificar operações permitidas
    const operation = this.extractOperation(query.sql);
    if (!this.securityPolicy.allowedOperations.includes(operation)) {
      errors.push({
        code: 'OPERATION_NOT_ALLOWED',
        message: `Operação ${operation} não permitida. Apenas ${this.securityPolicy.allowedOperations.join(', ')} são permitidas.`,
        severity: 'error',
      });
    }

    // Verificar tabelas permitidas
    query.tables.forEach(table => {
      if (!this.securityPolicy.allowedTables.includes(table)) {
        errors.push({
          code: 'TABLE_NOT_ALLOWED',
          message: `Tabela ${table} não está na lista de tabelas permitidas.`,
          severity: 'error',
        });
      }
    });

    // Verificar colunas restritas
    this.securityPolicy.restrictedColumns.forEach(restriction => {
      if (query.tables.includes(restriction.table)) {
        const columnsUsed = this.extractColumns(query.sql, restriction.table);
        const restrictedColumnsUsed = columnsUsed.filter(col => 
          restriction.columns.includes(col)
        );

        if (restrictedColumnsUsed.length > 0) {
          errors.push({
            code: 'RESTRICTED_COLUMNS',
            message: `Uso de colunas restritas em ${restriction.table}: ${restrictedColumnsUsed.join(', ')}`,
            severity: 'error',
          });
        }
      }
    });

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  private async estimateQueryCost(sql: string): Promise<any> {
    try {
      const [job] = await this.bigquery.createQueryJob({
        query: sql,
        dryRun: true,
      });

      return {
        processingBytes: job.metadata.statistics.totalBytesProcessed,
        processingTime: 'N/A', // Não disponível em dry run
        estimatedCost: this.calculateCost(job.metadata.statistics.totalBytesProcessed),
        affectedRows: job.metadata.statistics.query.numDmlAffectedRows || 0,
      };
    } catch (error) {
      this.logger.error(`Erro ao estimar custo: ${error.message}`);
      return null;
    }
  }

  private async analyzeOptimizations(query: GeneratedQuery): Promise<any[]> {
    const optimizations = [];

    // Verificar uso de particionamento
    if (this.shouldUsePartitioning(query)) {
      optimizations.push({
        type: 'partition',
        description: 'Consulta pode se beneficiar de particionamento',
        recommendation: 'Considere usar particionamento por data em consultas temporais',
        estimatedImpact: {
          costReduction: 0.4, // 40% de redução estimada
        },
      });
    }

    // Verificar uso de clustering
    if (this.shouldUseClustering(query)) {
      optimizations.push({
        type: 'clustering',
        description: 'Consulta pode se beneficiar de clustering',
        recommendation: 'Considere usar clustering nas colunas mais filtradas',
        estimatedImpact: {
          costReduction: 0.3, // 30% de redução estimada
        },
      });
    }

    return optimizations;
  }

  private extractOperation(sql: string): 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE' {
    const operation = sql.trim().split(' ')[0].toUpperCase();
    return operation as 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE';
  }

  private extractColumns(sql: string, table: string): string[] {
    // Implementação simplificada - em produção, usar um parser SQL adequado
    const columns = new Set<string>();
    const regex = new RegExp(`${table}\\.([\\w_]+)`, 'gi');
    let match;

    while ((match = regex.exec(sql)) !== null) {
      columns.add(match[1]);
    }

    return Array.from(columns);
  }

  private calculateCost(bytesProcessed: number): number {
    // Custo aproximado do BigQuery: $5 por TB
    return (bytesProcessed / 1099511627776) * 5; // Converter bytes para TB e multiplicar por $5
  }

  private shouldUsePartitioning(query: GeneratedQuery): boolean {
    const hasDateFilter = query.sql.toLowerCase().includes('data_pedido') ||
                         query.sql.toLowerCase().includes('date');
    return hasDateFilter && query.tables.some(t => ['PEDIDOS', 'ASSINATURA'].includes(t));
  }

  private shouldUseClustering(query: GeneratedQuery): boolean {
    const hasJoins = query.sql.toLowerCase().includes('join');
    const hasGroupBy = query.sql.toLowerCase().includes('group by');
    return hasJoins || hasGroupBy;
  }
} 