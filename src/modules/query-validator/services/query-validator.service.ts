import { Injectable, Logger, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BigQuery } from '@google-cloud/bigquery';
import { GeneratedQuery } from '../../query-generator/interfaces/query-generator.interface';
import {
  ValidationResult,
  ValidationError,
  ValidationWarning,
  QueryResult,
  SecurityPolicy,
  QueryValidationResult,
  QueryResultField,
  DryRunResult,
} from '../interfaces/query-validator.interface';
import { DEFAULT_SECURITY_POLICY } from '../constants/security-policies';
import { IBigQueryService, BIGQUERY_SERVICE } from '../../../database/bigquery/interfaces/bigquery.interface';

@Injectable()
export class QueryValidatorService {
  private readonly logger = new Logger(QueryValidatorService.name);
  private readonly bigquery: BigQuery;
  private readonly securityPolicy: SecurityPolicy;
  private readonly maxBytesProcessed = 1_000_000_000; // 1GB
  private readonly forbiddenKeywords = [
    'INSERT',
    'UPDATE',
    'DELETE',
    'DROP',
    'CREATE',
    'ALTER',
    'GRANT',
    'REVOKE',
  ];
  private readonly MAX_BYTES_ALLOWED = 1024 * 1024 * 1024; // 1GB
  private readonly DISALLOWED_COMMANDS = [
    'INSERT',
    'UPDATE',
    'DELETE',
    'DROP',
    'CREATE',
    'ALTER',
    'TRUNCATE',
    'MERGE',
    'GRANT',
    'REVOKE',
  ] as const;
  private readonly maxQueryCost: number;
  private readonly maxExecutionTime: number;
  private readonly allowedTables: string[];

  constructor(
    private readonly configService: ConfigService,
    @Inject(BIGQUERY_SERVICE)
    private readonly bigQueryService: IBigQueryService
  ) {
    this.bigquery = new BigQuery({
      projectId: this.configService.get<string>('bigquery.projectId'),
      keyFilename: this.configService.get<string>('bigquery.keyFilename'),
    });

    this.securityPolicy = {
      allowedOperations: ['SELECT'],
      maxBytesProcessed: 1000000000, // 1GB
      maxRows: 10000,
      allowedTables: ['PEDIDOS', 'PRODUTOS', 'ASSINATURA', 'CLIENTES', 'STATUS_CLIENTES', 'STATUS_ASSINANTES'],
      restrictedColumns: [
        {
          table: 'CLIENTES',
          columns: ['clientProfileData_document', 'clientProfileData_phone'],
        },
      ],
    };
  }

  /**
   * Valida uma consulta SQL
   * @param query Consulta SQL a ser validada
   * @returns Resultado da validação
   */
  public async validateQuery(query: string): Promise<QueryValidationResult> {
    if (!query?.trim()) {
      return {
        isValid: false,
        errors: [{
          code: 'EMPTY_QUERY',
          message: 'Query não pode estar vazia',
          severity: 'error'
        }]
      };
    }

    try {
      // Verificar se contém operações não permitidas
      if (this.containsDisallowedCommands(query)) {
        return {
          isValid: false,
          errors: [{
            code: 'INVALID_OPERATION',
            message: 'Operações de modificação não são permitidas',
            severity: 'error'
          }]
        };
      }

      // Verificar sintaxe básica
      if (!query.trim().toUpperCase().startsWith('SELECT')) {
        return {
          isValid: false,
          errors: [{
            code: 'SYNTAX_ERROR',
            message: 'A query deve começar com SELECT',
            severity: 'error'
          }]
        };
      }

      // Verificar tabelas permitidas
      const tables = this.extractTableNames(query);
      const unauthorizedTables = tables.filter(
        table => !this.securityPolicy.allowedTables.includes(table)
      );

      if (unauthorizedTables.length > 0) {
        return {
          isValid: false,
          errors: [{
            code: 'UNAUTHORIZED_TABLE',
            message: `Acesso não autorizado às tabelas: ${unauthorizedTables.join(', ')}`,
            severity: 'error'
          }]
        };
      }

      // Verificar limites de recursos
      const estimatedCost = await this.estimateQueryCost(query);
      if (estimatedCost.processingBytes > this.MAX_BYTES_ALLOWED) {
        return {
          isValid: false,
          errors: [{
            code: 'RESOURCE_LIMIT',
            message: `A query excede o limite de processamento de dados (${this.MAX_BYTES_ALLOWED} bytes)`,
            severity: 'error'
          }],
          estimatedCost
        };
      }

      // Se passou por todas as validações
      return {
        isValid: true,
        warnings: [],
        estimatedCost
      };
    } catch (error: any) {
      this.logger.error('Erro ao validar query:', error);
      return {
        isValid: false,
        errors: [{
          code: 'VALIDATION_ERROR',
          message: error.message || 'Erro ao validar query',
          severity: 'error'
        }]
      };
    }
  }

  /**
   * Estima o custo de uma consulta
   * @param query Consulta SQL
   * @returns Estimativa de custo
   */
  public async estimateQueryCost(query: string): Promise<any> {
    try {
      const bytesProcessed = await this.bigQueryService.estimateCost(query);
      return {
        processingBytes: bytesProcessed,
        processingTime: '0s',
        estimatedCost: this.calculateEstimatedCost(bytesProcessed),
        affectedRows: 0,
      };
    } catch (error) {
      this.logger.error('Erro ao estimar custo da query:', error);
      return {
        processingBytes: 0,
        processingTime: '0s',
        estimatedCost: 0,
        affectedRows: 0,
      };
    }
  }

  private calculateEstimatedCost(bytesProcessed: number): number {
    // Custo por TB = $5
    const terabytes = bytesProcessed / (1024 * 1024 * 1024 * 1024);
    return terabytes * 5;
  }

  private extractTableNames(query: string): string[] {
    const fromRegex = /FROM\s+([^\s,;()]+)/gi;
    const joinRegex = /JOIN\s+([^\s,;()]+)/gi;
    const tables = new Set<string>();

    let match;
    while ((match = fromRegex.exec(query)) !== null) {
      tables.add(match[1].toUpperCase());
    }
    while ((match = joinRegex.exec(query)) !== null) {
      tables.add(match[1].toUpperCase());
    }

    return Array.from(tables);
  }

  private containsRestrictedColumns(query: string, table: string, columns: string[]): boolean {
    const normalizedQuery = query.toUpperCase();
    const normalizedTable = table.toUpperCase();
    return columns.some(column => {
      const normalizedColumn = column.toUpperCase();
      return normalizedQuery.includes(`${normalizedTable}.${normalizedColumn}`) ||
             normalizedQuery.includes(`${normalizedColumn}`);
    });
  }

  private containsMaliciousComments(query: string): boolean {
    const commentRegex = /--.*$|\/\*[\s\S]*?\*\//gm;
    const comments = query.match(commentRegex) || [];

    const suspiciousPatterns = [
      /union/i,
      /select.*from/i,
      /insert/i,
      /update/i,
      /delete/i,
      /drop/i,
      /exec/i,
      /execute/i,
    ];

    return comments.some(comment =>
      suspiciousPatterns.some(pattern => pattern.test(comment))
    );
  }

  /**
   * Remove comentários e espaços em branco extras da consulta
   * @param query Consulta SQL
   * @returns Consulta limpa
   */
  private sanitizeQuery(query: string): string {
    return query
      .replace(/--.*$/gm, '') // Remove comentários de linha única
      .replace(/\/\*[\s\S]*?\*\//g, '') // Remove comentários multilinhas
      .replace(/\s+/g, ' ') // Normaliza espaços
      .trim();
  }

  /**
   * Verifica se a consulta contém comandos não permitidos
   * @param query Consulta SQL
   * @returns true se contiver comandos não permitidos
   */
  private containsDisallowedCommands(query: string): boolean {
    const normalizedQuery = query.toUpperCase();
    return this.DISALLOWED_COMMANDS.some(command =>
      normalizedQuery.includes(command)
    );
  }

  private validateSyntax(query: string): ValidationResult {
    try {
      if (!query || query.trim().length === 0) {
        return {
          isValid: false,
          errors: [{
            code: 'EMPTY_QUERY',
            message: 'A query não pode estar vazia',
            severity: 'error',
          }],
        };
      }

      // Verifica se a query começa com SELECT
      if (!query.trim().toUpperCase().startsWith('SELECT')) {
        return {
          isValid: false,
          errors: [{
            code: 'INVALID_OPERATION',
            message: 'Apenas operações SELECT são permitidas',
            severity: 'error',
          }],
        };
      }

      // Verifica se há comentários maliciosos
      if (this.containsMaliciousComments(query)) {
        return {
          isValid: false,
          errors: [{
            code: 'MALICIOUS_COMMENT',
            message: 'Comentários maliciosos detectados na query',
            severity: 'error',
          }],
        };
      }

      return { isValid: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido na validação de sintaxe';
      this.logger.error({
        message: 'Erro ao validar sintaxe da query',
        error: errorMessage,
        query,
      });

      return {
        isValid: false,
        errors: [{
          code: 'SYNTAX_ERROR',
          message: errorMessage,
          severity: 'error',
        }],
      };
    }
  }

  private async validateSecurity(query: string): Promise<ValidationResult> {
    try {
      // Verifica tabelas permitidas
      const usedTables = this.extractTableNames(query);
      const unauthorizedTables = usedTables.filter(
        table => !this.securityPolicy.allowedTables.includes(table),
      );

      if (unauthorizedTables.length > 0) {
        return {
          isValid: false,
          errors: [{
            code: 'UNAUTHORIZED_TABLES',
            message: `Tabelas não autorizadas: ${unauthorizedTables.join(', ')}`,
            severity: 'error',
          }],
        };
      }

      // Verifica colunas restritas
      for (const restriction of this.securityPolicy.restrictedColumns) {
        if (this.containsRestrictedColumns(query, restriction.table, restriction.columns)) {
          return {
            isValid: false,
            errors: [{
              code: 'RESTRICTED_COLUMNS',
              message: `Acesso a colunas restritas na tabela ${restriction.table}`,
              severity: 'error',
            }],
          };
        }
      }

      return { isValid: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido na validação de segurança';
      this.logger.error({
        message: 'Erro ao validar segurança da query',
        error: errorMessage,
        query,
      });

      return {
        isValid: false,
        errors: [{
          code: 'SECURITY_ERROR',
          message: errorMessage,
          severity: 'error',
        }],
      };
    }
  }

  /**
   * Valida a sintaxe e segurança de uma consulta gerada
   * @param query Consulta gerada
   * @returns Resultado da validação
   */
  async validateGeneratedQuery(query: GeneratedQuery): Promise<ValidationResult> {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    try {
      // Validar sintaxe
      const [job] = await this.bigquery.createQueryJob({
        query: query.sql,
        dryRun: true,
      });

      // Validar segurança
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
          const restrictedColumnsUsed = columnsUsed.filter(col => restriction.columns.includes(col));

          if (restrictedColumnsUsed.length > 0) {
            errors.push({
              code: 'RESTRICTED_COLUMNS',
              message: `Uso de colunas restritas em ${restriction.table}: ${restrictedColumnsUsed.join(', ')}`,
              severity: 'error',
            });
          }
        }
      });

      // Verificar otimizações possíveis
      if (this.shouldUsePartitioning(query)) {
        warnings.push({
          code: 'SUGGEST_PARTITIONING',
          message: 'Considere usar particionamento por data em consultas temporais',
          severity: 'warning',
        });
      }

      if (this.shouldUseClustering(query)) {
        warnings.push({
          code: 'SUGGEST_CLUSTERING',
          message: 'Considere usar clustering nas colunas mais filtradas',
          severity: 'warning',
        });
      }

      return {
        isValid: errors.length === 0,
        errors,
        warnings,
      };
    } catch (error: unknown) {
      const err = error instanceof Error ? error : new Error('Erro desconhecido');
      errors.push({
        code: 'VALIDATION_ERROR',
        message: err.message,
        severity: 'error',
      });

      return {
        isValid: false,
        errors,
        warnings,
      };
    }
  }

  private extractOperation(sql: string): 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE' {
    const operation = sql.trim().split(' ')[0].toUpperCase();
    return operation as 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE';
  }

  private extractColumns(sql: string, table: string): string[] {
    const columns = new Set<string>();
    const regex = new RegExp(`${table}\\.([\\w_]+)`, 'gi');
    let match;

    while ((match = regex.exec(sql)) !== null) {
      columns.add(match[1]);
    }

    return Array.from(columns);
  }

  private shouldUsePartitioning(query: GeneratedQuery): boolean {
    const hasDateFilter =
      query.sql.toLowerCase().includes('data_pedido') || query.sql.toLowerCase().includes('date');
    return hasDateFilter && query.tables.some(t => ['PEDIDOS', 'ASSINATURA'].includes(t));
  }

  private shouldUseClustering(query: GeneratedQuery): boolean {
    const hasJoins = query.sql.toLowerCase().includes('join');
    const hasGroupBy = query.sql.toLowerCase().includes('group by');
    return hasJoins || hasGroupBy;
  }
}
