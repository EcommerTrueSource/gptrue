import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BigQuery, Job, Query } from '@google-cloud/bigquery';
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
import { BigQueryService } from '../../../database/bigquery/bigquery.service';

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

  constructor(
    private readonly configService: ConfigService,
    private readonly bigQueryService: BigQueryService,
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
  public async validateQuery(query: string): Promise<ValidationResult> {
    try {
      const syntaxResult = await this.validateSyntax(query);
      if (!syntaxResult.isValid) {
        return syntaxResult;
      }

      const securityResult = await this.validateSecurity(query);
      if (!securityResult.isValid) {
        return securityResult;
      }

      const dryRunResult = await this.bigQueryService.dryRun(query);

      return {
        isValid: true,
        estimatedCost: {
          processingBytes: dryRunResult.totalBytesProcessed,
          processingTime: new Date().toISOString(),
          estimatedCost: this.calculateEstimatedCost(dryRunResult.totalBytesProcessed),
          affectedRows: 0,
        },
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido na validação da query';
      this.logger.error({
        message: 'Erro ao validar query',
        error: errorMessage,
        query,
      });

      return {
        isValid: false,
        errors: [{
          code: 'VALIDATION_ERROR',
          message: errorMessage,
          severity: 'error',
        }],
      };
    }
  }

  private async validateSyntax(query: string): Promise<ValidationResult> {
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

  private async executeQuery(query: string): Promise<QueryResult> {
    try {
      const result = await this.bigQueryService.dryRun(query);

      if (!result || !result.schema) {
        throw new Error('Resultado da dry run inválido');
      }

      return {
        data: [],
        metadata: {
          schema: result.schema.fields.map(field => ({
            name: field.name,
            type: field.type,
            mode: field.mode as 'NULLABLE' | 'REQUIRED' | 'REPEATED',
            description: field.description,
          })),
          totalRows: 0,
          processingTime: new Date().toISOString(),
          bytesProcessed: result.totalBytesProcessed,
          cacheHit: false,
        },
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido ao executar dry run';
      this.logger.error({
        message: 'Erro ao executar dry run da query',
        error: errorMessage,
        query,
      });
      throw error;
    }
  }

  private calculateEstimatedCost(bytesProcessed: number): number {
    // Custo por TB = $5 (valor exemplo)
    const costPerTB = 5;
    const bytesPerTB = 1099511627776; // 1 TB em bytes
    return (bytesProcessed / bytesPerTB) * costPerTB;
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
      const patterns = [
        `${normalizedTable}.${normalizedColumn}`,
        `${normalizedColumn}`,
      ];
      return patterns.some(pattern => normalizedQuery.includes(pattern));
    });
  }

  private containsMaliciousComments(query: string): boolean {
    const maliciousPatterns = [
      '--',
      '/*',
      '*/',
      '#',
      ';--',
      '1=1',
      'OR 1=1',
      'DROP',
      'DELETE',
      'UPDATE',
      'INSERT',
    ];

    const normalizedQuery = query.toUpperCase();
    return maliciousPatterns.some(pattern =>
      normalizedQuery.includes(pattern.toUpperCase())
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
      .trim() // Remove espaços em branco no início e fim
      .replace(/\s+/g, ' '); // Substitui múltiplos espaços por um único espaço
  }

  /**
   * Verifica se a consulta contém comandos não permitidos
   * @param query Consulta SQL
   * @returns true se contiver comandos não permitidos
   */
  private containsDisallowedCommands(query: string): boolean {
    const upperQuery = query.toUpperCase();
    return this.DISALLOWED_COMMANDS.some(command => {
      const regex = new RegExp(`\\b${command}\\b`);
      return regex.test(upperQuery);
    });
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
