import { Injectable, Logger, Inject, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BigQuery } from '@google-cloud/bigquery';
import * as fs from 'fs';
import * as path from 'path';
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
export class QueryValidatorService implements OnModuleInit {
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
  private template: string;
  private readonly BIGQUERY_FUNCTIONS = [
    'unnest', 'json_extract_array', 'json_extract_scalar', 'json_extract',
    'cast', 'parse_json', 'to_json_string', 'json_value', 'json_query',
    'array', 'generate_array', 'array_concat', 'array_length', 'array_to_string',
    'date', 'datetime', 'timestamp', 'time', 'extract', 'date_trunc',
    'struct', 'to_hex', 'to_base64', 'format', 'concat', 'substr',
    'regexp_extract', 'regexp_replace', 'split', 'trim', 'lower', 'upper'
  ];

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
      allowedTables: [
        'pedidos', 'produtos', 'assinaturas', 'clientes', 'status_clientes', 'status_assinantes'
      ],
      restrictedColumns: [
        {
          table: 'clientes',
          columns: ['clientProfileData_document', 'clientProfileData_phone'],
        },
      ],
    };

    this.logger.log('Serviço de validação de consultas SQL inicializado');
  }

  onModuleInit() {
    try {
      // Usar o template do diretório raiz do projeto
      const templatePath = path.join(process.cwd(), 'templates', 'files', 'query-validator.template.txt');
      this.template = fs.readFileSync(templatePath, 'utf8');
      this.logger.log(`Template de validação de consultas carregado com sucesso: ${templatePath}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      const errorStack = error instanceof Error ? error.stack : '';
      this.logger.error(`Erro ao carregar o template de validação de consultas: ${errorMessage}`, errorStack);
      throw error;
    }
  }

  /**
   * Verifica se a consulta contém padrões de sintaxe inválidos para processamento de JSON
   * @param query Consulta SQL
   * @returns Objeto com resultado da validação
   */
  private validateJsonSyntax(query: string): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Padrões de sintaxe inválidos
    const invalidPatterns = [
      {
        pattern: /INNER\s+JOIN\s+UNNEST\s*\(/i,
        message: 'Sintaxe inválida: Não use INNER JOIN com UNNEST. Use a sintaxe correta: FROM tabela, UNNEST(...) AS alias'
      },
      {
        pattern: /INNER\s+JOIN\s+JSON_EXTRACT/i,
        message: 'Sintaxe inválida: Não use INNER JOIN com JSON_EXTRACT. Use a sintaxe correta: JSON_EXTRACT_SCALAR(item, \'$.campo\') AS alias'
      },
      {
        pattern: /INNER\s+JOIN\s+CAST\s*\(/i,
        message: 'Sintaxe inválida: Não use INNER JOIN com CAST. Use a sintaxe correta: CAST(JSON_EXTRACT_SCALAR(item, \'$.campo\') AS TIPO) AS alias'
      },
      {
        pattern: /AS\s+\w+\.\w+/i,
        message: 'Sintaxe inválida: Não use aliases com ponto (exemplo: AS i.quantidade). Use aliases simples (exemplo: AS quantidade)'
      }
    ];

    // Verificar cada padrão inválido
    for (const { pattern, message } of invalidPatterns) {
      if (pattern.test(query)) {
        errors.push(message);
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Valida uma consulta SQL
   * @param query Consulta SQL a ser validada
   * @returns Resultado da validação
   */
  public async validateQuery(query: string): Promise<QueryValidationResult> {
    this.logger.debug(`Validando consulta SQL: ${query.substring(0, 100)}...`);

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
        this.logger.warn(`Consulta contém comandos não permitidos: ${query.substring(0, 100)}...`);
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
      const normalizedQuery = query.trim().toUpperCase();
      if (!normalizedQuery.startsWith('SELECT') && !normalizedQuery.startsWith('WITH')) {
        this.logger.warn(`Consulta não começa com SELECT ou WITH: ${query.substring(0, 100)}...`);
        return {
          isValid: false,
          errors: [{
            code: 'SYNTAX_ERROR',
            message: 'A query deve começar com SELECT ou WITH',
            severity: 'error'
          }]
        };
      }

      // Verificar sintaxe de processamento de JSON
      const jsonSyntaxValidation = this.validateJsonSyntax(query);
      if (!jsonSyntaxValidation.isValid) {
        this.logger.warn(`Consulta contém sintaxe inválida para processamento de JSON: ${jsonSyntaxValidation.errors.join('; ')}`);
        return {
          isValid: false,
          errors: jsonSyntaxValidation.errors.map(message => ({
            code: 'JSON_SYNTAX_ERROR',
            message,
            severity: 'error'
          }))
        };
      }

      // Extrair todas as CTEs definidas na consulta, incluindo CTEs aninhadas
      const cteNames = this.extractAllCteNames(query);
      if (cteNames.size > 0) {
        this.logger.debug(`CTEs identificadas na consulta (incluindo aninhadas): ${Array.from(cteNames).join(', ')}`);
      }

      // Verificar tabelas permitidas
      const tables = this.extractTableNames(query);

      if (tables.length > 0) {
        this.logger.debug(`Tabelas reais encontradas na consulta: ${tables.join(', ')}`);

        const unauthorizedTables = tables.filter(
          table => !this.securityPolicy.allowedTables.includes(table)
        );

        if (unauthorizedTables.length > 0) {
          this.logger.warn(`Consulta contém tabelas não autorizadas: ${unauthorizedTables.join(', ')}`);
          return {
            isValid: false,
            errors: [{
              code: 'UNAUTHORIZED_TABLE',
              message: `Acesso não autorizado às tabelas: ${unauthorizedTables.join(', ')}`,
              severity: 'error'
            }]
          };
        }
      } else {
        this.logger.debug('Nenhuma tabela real identificada na consulta (pode conter apenas funções ou CTEs)');
      }

      // Tentar validar a sintaxe com um dry run no BigQuery
      try {
        // Verificar limites de recursos
        const estimatedCost = await this.estimateQueryCost(query);
        this.logger.debug(`Custo estimado da consulta: ${estimatedCost.processingBytes} bytes`);

        if (estimatedCost.processingBytes > this.MAX_BYTES_ALLOWED) {
          this.logger.warn(`Consulta excede o limite de processamento: ${estimatedCost.processingBytes} bytes`);
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
        this.logger.debug('Consulta validada com sucesso');
        return {
          isValid: true,
          warnings: [],
          estimatedCost
        };
      } catch (estimationError: any) {
        // Capturar erros de sintaxe do BigQuery
        const errorMessage = estimationError?.message || 'Erro desconhecido';

        // Verificar se é um erro de sintaxe
        if (errorMessage.includes('Syntax error')) {
          this.logger.warn(`Erro de sintaxe SQL detectado: ${errorMessage}`);
          return {
            isValid: false,
            errors: [{
              code: 'SYNTAX_ERROR',
              message: `Erro de sintaxe SQL: ${errorMessage}`,
              severity: 'error'
            }]
          };
        }

        // Para outros erros, logar mas não bloquear a consulta
        this.logger.warn(`Erro ao estimar custo da consulta: ${errorMessage}`);

        // Permitir a execução mesmo com erro na estimativa de custo
        return {
          isValid: true,
          warnings: [{
            code: 'COST_ESTIMATION_FAILED',
            message: `Não foi possível estimar o custo da consulta: ${errorMessage}`,
            severity: 'warning'
          }]
        };
      }
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

      // Calcula o custo estimado em dólares
      const estimatedCost = this.calculateEstimatedCost(bytesProcessed);

      // Estima o tempo de processamento (aproximado)
      const processingTime = this.estimateProcessingTime(bytesProcessed);

      return {
        processingBytes: bytesProcessed,
        processingTime,
        estimatedCost,
        affectedRows: 0, // Não é possível estimar com precisão sem executar
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

  /**
   * Verifica se uma tabela é uma CTE válida ou tem um prefixo de CTE permitido
   * @param tableName Nome da tabela
   * @param cteNames Conjunto de nomes de CTEs definidas na consulta
   * @returns true se for uma CTE válida
   */
  private isValidCte(tableName: string, cteNames: Set<string>): boolean {
    const lowerTableName = tableName.toLowerCase();

    // Verificar se é uma CTE definida na consulta
    if (cteNames.has(lowerTableName)) {
      return true;
    }

    // Lista de prefixos de CTEs permitidos
    const allowedCtePrefixes = [
      'tmp_pedidos_', 'tmp_clientes_', 'tmp_produtos_', 'tmp_assinaturas_', 'tmp_status_',
      'cte_pedidos_', 'cte_clientes_', 'cte_produtos_', 'cte_assinaturas_', 'cte_status_',
      // Adicionando prefixos específicos para CTEs aninhadas comuns
      'tmp_itens_', 'tmp_vendas_', 'tmp_resultado_', 'tmp_dados_'
    ];

    // Verificar se tem um prefixo permitido
    return allowedCtePrefixes.some(prefix => lowerTableName.startsWith(prefix));
  }

  /**
   * Extrai todas as CTEs definidas na consulta, incluindo CTEs aninhadas
   * @param query Consulta SQL
   * @returns Conjunto de nomes de CTEs
   */
  private extractAllCteNames(query: string): Set<string> {
    // Regex para capturar todas as definições de CTE
    // Formato: WITH nome AS (...) ou , nome AS (...)
    const cteRegex = /(?:WITH|,)\s+([a-zA-Z0-9_]+)\s+AS\s*\(/gi;
    const cteNames = new Set<string>();

    let match;
    while ((match = cteRegex.exec(query)) !== null) {
      if (match[1]) {
        cteNames.add(match[1].toLowerCase());
      }
    }

    return cteNames;
  }

  private extractTableNames(query: string): string[] {
    try {
      // Extrair todas as CTEs definidas na consulta, incluindo CTEs aninhadas
      const cteNames = this.extractAllCteNames(query);

      // Log das CTEs identificadas
      if (cteNames.size > 0) {
        this.logger.debug(`CTEs identificadas na consulta: ${Array.from(cteNames).join(', ')}`);
      }

      // Extrair todas as cláusulas FROM e JOIN
      const clauseRegex = /(FROM|JOIN)\s+([^,;()]*(?:\([^)]*\)[^,;()]*)*)/gi;
      const tables = new Set<string>();

      let match;
      while ((match = clauseRegex.exec(query)) !== null) {
        const clause = match[1]; // FROM ou JOIN
        const content = match[2].trim(); // Conteúdo após FROM/JOIN

        // Verificar se é uma subconsulta
        if (content.startsWith('(')) {
          this.logger.debug(`Ignorando subconsulta em ${clause}: ${content.substring(0, 30)}...`);
          continue;
        }

        // Verificar se é um padrão de função
        if (this.containsFunctionPattern(content)) {
          this.logger.debug(`Ignorando padrão de função em ${clause}: ${content}`);
          continue;
        }

        // Extrair nome da tabela (considerando backticks e qualificadores)
        const tableMatch = content.match(/^`?([^`\s]+(?:\.[^`\s]+){0,2})`?(?:\s+AS\s+[a-zA-Z0-9_]+)?/i);
        if (tableMatch && tableMatch[1]) {
          // Extrair apenas o nome da tabela (sem projeto e dataset)
          const parts = tableMatch[1].split('.');
          const tableOnly = parts[parts.length - 1].replace(/`/g, '').toLowerCase();

          // Verificar se é uma função do BigQuery
          if (this.isBigQueryFunction(tableOnly)) {
            this.logger.debug(`Ignorando função do BigQuery: ${tableOnly}`);
            continue;
          }

          // Verificar se é uma CTE válida
          if (this.isValidCte(tableOnly, cteNames)) {
            this.logger.debug(`Tabela ignorada por ser uma CTE válida: ${tableOnly}`);
            continue;
          }

          // Adicionar à lista de tabelas reais
          tables.add(tableOnly);
          this.logger.debug(`Tabela real identificada: ${tableOnly}`);
        }
      }

      return Array.from(tables);
    } catch (error) {
      this.logger.error('Erro ao extrair nomes de tabelas:', error);
      return []; // Em caso de erro, retorna lista vazia para evitar bloqueios indevidos
    }
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
    // Normaliza a consulta removendo comentários e espaços extras
    const normalizedQuery = this.sanitizeQuery(query).toUpperCase();

    // Verifica se há comandos não permitidos usando expressões regulares com limites de palavra
    return this.DISALLOWED_COMMANDS.some(command =>
      new RegExp(`\\b${command}\\b`, 'i').test(normalizedQuery)
    );
  }

  /**
   * Estima o tempo de processamento com base no volume de dados
   * @param bytesProcessed Bytes processados
   * @returns Tempo estimado em formato legível
   */
  private estimateProcessingTime(bytesProcessed: number): string {
    // Estimativa simples: 1GB ~ 2s (ajuste conforme necessário)
    const seconds = Math.max(1, Math.ceil(bytesProcessed / (1024 * 1024 * 1024) * 2));

    if (seconds < 60) {
      return `${seconds}s`;
    } else if (seconds < 3600) {
      return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
    } else {
      return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
    }
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
      // Extrair todas as CTEs definidas na consulta, incluindo CTEs aninhadas
      const cteNames = this.extractAllCteNames(query);

      // Verifica tabelas permitidas
      const usedTables = this.extractTableNames(query);
      const unauthorizedTables = usedTables.filter(
        table => !this.securityPolicy.allowedTables.includes(table)
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

      // Identificar CTEs definidas na consulta
      const cteNames = this.extractAllCteNames(query.sql);

      // Verificar tabelas permitidas
      query.tables.forEach(table => {
        // Ignorar tabelas que são CTEs válidas
        if (!this.isValidCte(table, cteNames) && !this.securityPolicy.allowedTables.includes(table)) {
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

      // Verificar limites de recursos
      if (job.metadata.statistics.totalBytesProcessed > this.securityPolicy.maxBytesProcessed) {
        errors.push({
          code: 'RESOURCE_LIMIT',
          message: `A query excede o limite de processamento de dados (${this.securityPolicy.maxBytesProcessed} bytes)`,
          severity: 'error',
        });
      }

      // Verificar se a consulta usa particionamento quando necessário
      if (this.shouldUsePartitioning(query) && !query.sql.toLowerCase().includes('partition by')) {
        warnings.push({
          code: 'MISSING_PARTITIONING',
          message: 'Considere usar particionamento para melhorar a performance',
          severity: 'warning',
        });
      }

      // Verificar se a consulta usa clustering quando necessário
      if (this.shouldUseClustering(query) && !query.sql.toLowerCase().includes('cluster by')) {
        warnings.push({
          code: 'MISSING_CLUSTERING',
          message: 'Considere usar clustering para melhorar a performance',
          severity: 'warning',
        });
      }

      return {
        isValid: errors.length === 0,
        errors,
        warnings,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
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

  private isBigQueryFunction(identifier: string): boolean {
    const lowerIdentifier = identifier.toLowerCase();

    // Verificar na lista de funções conhecidas
    if (this.BIGQUERY_FUNCTIONS.includes(lowerIdentifier)) {
      return true;
    }

    // Verificar padrões comuns de funções do BigQuery
    // Muitas funções seguem padrões como: st_* (geoespaciais), ml_* (machine learning), etc.
    const functionPatterns = [
      /^st_/, // Funções geoespaciais
      /^ml_/, // Funções de machine learning
      /^hll_/, // Funções HyperLogLog
      /^net_/, // Funções de rede
      /^session_/, // Funções de sessão
      /^to_/, // Funções de conversão (to_json, to_hex, etc.)
      /^is_/, // Funções de verificação (is_nan, is_inf, etc.)
      /^format_/, // Funções de formatação
      /^parse_/, // Funções de parsing
      /^generate_/, // Funções de geração
      /^array_/, // Funções de array
      /^string_/, // Funções de string
      /^date_/, // Funções de data
      /^timestamp_/, // Funções de timestamp
      /^time_/, // Funções de tempo
      /^datetime_/, // Funções de datetime
      /^json_/, // Funções JSON
    ];

    // Verificar se o identificador corresponde a algum padrão de função
    return functionPatterns.some(pattern => pattern.test(lowerIdentifier));
  }

  /**
   * Verifica se uma parte da consulta contém um padrão de função
   * Exemplo: FROM UNNEST(...) AS item
   * @param queryPart Parte da consulta a ser verificada
   * @returns true se contiver um padrão de função
   */
  private containsFunctionPattern(queryPart: string): boolean {
    // Padrões comuns de uso de funções em cláusulas FROM/JOIN
    const functionPatterns = [
      /UNNEST\s*\(/i,
      /JSON_EXTRACT\w*\s*\(/i,
      /CAST\s*\(/i,
      /ARRAY\w*\s*\(/i,
      /STRUCT\s*\(/i,
      /\w+\s*\([^)]*\)\s+AS\s+/i, // Qualquer função seguida por AS
    ];

    return functionPatterns.some(pattern => pattern.test(queryPart));
  }
}
