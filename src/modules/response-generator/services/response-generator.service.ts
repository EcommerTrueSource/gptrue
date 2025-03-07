import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';
import { OpenAIService } from '../../../integrations/openai/openai.service';
import { ResponseContext, GeneratedResponse } from '../interfaces/response-context.interface';
import { ProcessingResult } from '../../orchestrator/interfaces/conversation.interface';
import { GenerateResponseParams } from '../interfaces/response-generator.interface';

@Injectable()
export class ResponseGeneratorService implements OnModuleInit {
  private readonly logger = new Logger(ResponseGeneratorService.name);
  private template: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly openAIService: OpenAIService,
  ) {}

  onModuleInit() {
    try {
      // Usar o template do diretório raiz do projeto
      const templatePath = path.join(process.cwd(), 'templates', 'files', 'response-generator.template.txt');
      this.template = fs.readFileSync(templatePath, 'utf8');
      this.logger.log(`Template de geração de respostas carregado com sucesso: ${templatePath}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      const errorStack = error instanceof Error ? error.stack : '';
      this.logger.error(`Erro ao carregar o template de geração de respostas: ${errorMessage}`, errorStack);
      throw error;
    }
  }

  async generateResponse(params: GenerateResponseParams): Promise<ProcessingResult> {
    try {
      this.logger.debug(`Gerando resposta para pergunta: "${params.question}"`);
      const startTime = params.metadata?.startTime || Date.now();

      // Verificar se estamos adaptando uma resposta do cache
      const isAdaptingFromCache = params.metadata?.adaptFromCache === true;
      if (isAdaptingFromCache) {
        this.logger.debug(`Modo de adaptação de cache ativado para pergunta: "${params.question}"`);
      }

      // Construir o prompt apropriado
      const prompt = this.buildPrompt(params);

      // Obter resposta do OpenAI
      this.logger.debug('Enviando prompt para o OpenAI');
      let responseText: string;

      try {
        responseText = await this.openAIService.generateResponse(prompt);
      } catch (aiError) {
        this.logger.error(`Erro ao gerar resposta com OpenAI: ${aiError instanceof Error ? aiError.message : String(aiError)}`);

        // Se estamos adaptando do cache e ocorreu um erro, retornar a resposta original
        if (isAdaptingFromCache && params.queryResult?.metadata?.originalResponse) {
          this.logger.warn('Fallback: usando resposta original do cache devido a erro na adaptação');
          responseText = params.queryResult.metadata.originalResponse;
        } else {
          // Se não estamos adaptando ou não temos resposta original, lançar o erro
          throw aiError;
        }
      }

      // Calcular tempo de processamento
      const endTime = Date.now();
      const processingTimeMs = endTime - startTime;
      this.logger.debug(`Resposta gerada em ${processingTimeMs}ms`);

      // Extrair tabelas e SQL do contexto
      const tables = params.tables || [];
      const sql = params.query || params.queryResult?.metadata?.sql || '';

      // Gerar sugestões de perguntas relacionadas
      const suggestions = this.generateSuggestions(params.question, responseText);

      // Construir metadados apropriados
      const metadata: any = {
        source: isAdaptingFromCache ? 'cache' : 'generated',
        confidence: isAdaptingFromCache ? 0.9 : 0.95, // Ligeiramente menor para adaptações
        processingTimeMs,
        tables,
        sql,
      };

      // Se estamos adaptando, incluir informações adicionais
      if (isAdaptingFromCache) {
        metadata.adaptedFromCache = true;
        metadata.originalQuestion = params.queryResult?.metadata?.originalQuestion;
        // Não temos acesso direto ao cacheId aqui, então não o incluímos
      }

      return {
        message: responseText,
        suggestions: suggestions,
        metadata
      };
    } catch (error) {
      this.logger.error(`Erro ao gerar resposta: ${error instanceof Error ? error.message : String(error)}`);

      // Retornar uma resposta de erro amigável
      return {
        message: 'Desculpe, ocorreu um erro ao processar sua pergunta. Por favor, tente novamente.',
        metadata: {
          source: 'error',
          processingTimeMs: 0,
          error: {
            type: 'generation_error',
            details: error instanceof Error ? error.message : String(error)
          }
        },
        suggestions: []
      };
    }
  }

  private generateSuggestions(question: string, response: string): string[] {
    this.logger.debug('Gerando sugestões de perguntas relacionadas');
    // Implementação simples para gerar sugestões de perguntas relacionadas
    // Em uma implementação real, isso poderia usar NLP ou regras mais sofisticadas
    const defaultSuggestions = [
      'Como isso se compara com o período anterior?',
      'Quais são as tendências para os próximos meses?',
      'Qual o impacto disso nas vendas totais?'
    ];

    return defaultSuggestions;
  }

  private buildPrompt(params: GenerateResponseParams): string {
    const { question, queryResult, data, query, tables } = params;

    // Verificar se estamos adaptando uma resposta do cache
    if (params.metadata?.adaptFromCache && queryResult?.metadata?.originalResponse) {
      this.logger.debug(`Adaptando resposta do cache para a pergunta: "${question}"`);

      const originalQuestion = queryResult.metadata.originalQuestion || '';
      const originalResponse = queryResult.metadata.originalResponse || '';
      const sql = queryResult.metadata.sql || '';

      // Construir um prompt especial para adaptação de resposta
      return `
        ${this.template}

        TAREFA: Adaptar uma resposta existente para uma nova pergunta.

        PERGUNTA ORIGINAL: ${originalQuestion}

        RESPOSTA ORIGINAL: ${originalResponse}

        SQL UTILIZADO: ${sql}

        NOVA PERGUNTA: ${question}

        INSTRUÇÕES DETALHADAS:
        1. Analise cuidadosamente a diferença entre a pergunta original e a nova pergunta.
        2. Identifique quais informações da resposta original são relevantes para a nova pergunta.
        3. Adapte a resposta para responder PRECISAMENTE à nova pergunta, sem informações extras.
        4. Mantenha o estilo, tom e formatação da resposta original (emojis, negrito, etc).
        5. Se a nova pergunta pedir menos informações (ex: "top 1" em vez de "top 3"), forneça APENAS as informações solicitadas.
        6. Se a nova pergunta pedir mais informações que não estão disponíveis na resposta original, indique claramente que você está limitado aos dados disponíveis.

        EXEMPLOS:

        Exemplo 1:
        - Pergunta Original: "Quais foram os 3 produtos mais vendidos em janeiro?"
        - Resposta Original: "Os três produtos mais vendidos em janeiro foram: 1. Produto A (100 unidades), 2. Produto B (80 unidades), 3. Produto C (70 unidades)"
        - Nova Pergunta: "Qual foi o produto mais vendido em janeiro?"
        - Resposta Adaptada: "O produto mais vendido em janeiro foi o Produto A com 100 unidades vendidas."

        Exemplo 2:
        - Pergunta Original: "Qual foi o faturamento total de 2024?"
        - Resposta Original: "O faturamento total de 2024 foi de R$ 1.500.000,00."
        - Nova Pergunta: "Qual foi o faturamento médio mensal de 2024?"
        - Resposta Adaptada: "Com base no faturamento total de 2024 de R$ 1.500.000,00, o faturamento médio mensal foi de R$ 125.000,00."

        RESPOSTA ADAPTADA:
      `;
    }

    // Extrair dados do queryResult se disponível
    const resultData = queryResult?.rows || data || [];
    const resultQuery = query || queryResult?.metadata?.sql || '';
    const resultTables = tables || [];

    this.logger.debug(`Construindo prompt com ${resultData.length} linhas de dados e ${resultTables.length} tabelas`);

    // Usar o template definido
    const prompt = `
      ${this.template}

      PERGUNTA: ${question}

      DADOS:
      ${JSON.stringify(resultData, null, 2)}

      SQL:
      ${resultQuery}

      TABELAS:
      ${resultTables.join(', ')}

      RESPOSTA:
    `;

    return prompt;
  }
}
