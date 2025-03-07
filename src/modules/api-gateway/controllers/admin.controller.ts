import {
  Controller,
  Get,
  UseGuards,
  Request,
  HttpException,
  HttpStatus,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
} from '@nestjs/common';
import {
  ApiProperty,
  ApiOperation,
  ApiResponse,
  ApiUnauthorizedResponse,
  ApiForbiddenResponse,
  ApiInternalServerErrorResponse,
  ApiTags,
  ApiBearerAuth,
  ApiBody,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { MockAuthGuard } from '../../../common/guards/mock-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { UserRequest, UserData } from '../interfaces/request.interface';
import { OrchestratorService } from '../../orchestrator/services/orchestrator.service';
import {
  MetricsResponse,
  Template,
  TemplateListResponse,
  TemplateUpdateRequest,
  CacheClearOptions,
  CacheClearResponse,
  HealthCheckResponse,
} from '../../orchestrator/interfaces/orchestrator.interface';

// DTOs para documentação do Swagger
export class AdminMetricsResponseDto implements MetricsResponse {
  @ApiProperty({
    description: 'Métricas de performance',
    example: {
      averageResponseTimeMs: 245,
      cacheHitRate: 0.85,
      resourceUsage: {
        cpu: 45,
        memory: 1024,
        requests: 100
      }
    }
  })
  performance!: {
    averageResponseTimeMs: number;
    cacheHitRate: number;
    resourceUsage: {
      cpu: number;
      memory: number;
      requests: number;
    };
  };

  @ApiProperty({
    description: 'Métricas de qualidade',
    example: {
      positiveFeedbackRate: 0.92,
      accuracy: 0.95,
      abandonmentRate: 0.03
    }
  })
  quality!: {
    positiveFeedbackRate: number;
    accuracy: number;
    abandonmentRate: number;
  };

  @ApiProperty({
    description: 'Métricas de custos',
    example: {
      vertexAiCost: 50.25,
      bigQueryCost: 25.10,
      pineconeCost: 15.75
    }
  })
  costs!: {
    vertexAiCost: number;
    bigQueryCost: number;
    pineconeCost: number;
  };
}

export class AdminTemplateDto implements Template {
  @ApiProperty({
    description: 'ID único do template',
    example: 'template_123'
  })
  id!: string;

  @ApiProperty({
    description: 'Pergunta original',
    example: 'Quais os produtos mais vendidos?'
  })
  question!: string;

  @ApiProperty({
    description: 'Query SQL gerada',
    example: 'SELECT product, COUNT(*) as total FROM sales GROUP BY product ORDER BY total DESC LIMIT 5'
  })
  sql!: string;

  @ApiProperty({
    description: 'Métricas de uso',
    example: {
      hits: 150,
      lastUsed: '2024-02-26T15:30:00Z'
    }
  })
  usage!: {
    hits: number;
    lastUsed: string;
  };

  @ApiProperty({
    description: 'Feedback recebido',
    example: {
      positive: 45,
      negative: 3,
      comments: ['Excelente resposta', 'Muito útil'],
      needsReview: false,
      categories: ['vendas', 'produtos'],
      lastFeedbackDate: '2024-02-26T15:30:00Z'
    }
  })
  feedback!: {
    positive: number;
    negative: number;
    comments: string[];
    needsReview: boolean;
    categories?: string[];
    lastFeedbackDate?: string;
  };
}

export class AdminTemplateListResponseDto implements TemplateListResponse {
  @ApiProperty({
    description: 'Lista de templates',
    type: [AdminTemplateDto]
  })
  templates!: AdminTemplateDto[];

  @ApiProperty({
    description: 'Metadados da listagem',
    example: {
      total: 100,
      filtered: 1,
      page: 1,
      pageSize: 10
    }
  })
  metadata!: {
    total: number;
    filtered: number;
    page: number;
    pageSize: number;
  };
}

export class AdminTemplateUpdateRequestDto implements TemplateUpdateRequest {
  @ApiProperty({
    description: 'Query SQL atualizada',
    example: 'SELECT product, SUM(quantity) as total FROM sales GROUP BY product ORDER BY total DESC LIMIT 5',
    required: false
  })
  sql?: string;

  @ApiProperty({
    description: 'Resposta padrão',
    example: 'Os produtos mais vendidos são: {products}',
    required: false
  })
  response?: string;

  @ApiProperty({
    description: 'Metadados do template',
    example: {
      confidence: 0.95,
      ttl: 3600
    },
    required: false
  })
  metadata?: {
    confidence?: number;
    ttl?: number;
  };
}

export class AdminCacheClearOptionsDto implements CacheClearOptions {
  @ApiProperty({
    description: 'Tipo de limpeza',
    enum: ['all', 'type', 'period', 'performance'],
    example: 'all',
    required: false
  })
  type?: 'all' | 'type' | 'period' | 'performance';

  @ApiProperty({
    description: 'Data limite para limpeza',
    example: '2024-01-01T00:00:00Z',
    required: false
  })
  olderThan?: string;

  @ApiProperty({
    description: 'Confiança mínima',
    example: 0.85,
    required: false
  })
  minConfidence?: number;
}

export class AdminCacheClearResponseDto implements CacheClearResponse {
  @ApiProperty({
    description: 'Número de templates limpos',
    example: 150
  })
  clearedTemplates!: number;

  @ApiProperty({
    description: 'Número de consultas afetadas',
    example: 1500
  })
  affectedQueries!: number;

  @ApiProperty({
    description: 'Data e hora da limpeza',
    example: '2024-02-26T15:30:00Z'
  })
  timestamp!: string;
}

export class AdminHealthCheckResponseDto implements HealthCheckResponse {
  @ApiProperty({
    description: 'Status geral do sistema',
    enum: ['healthy', 'degraded', 'unhealthy'],
    example: 'healthy'
  })
  status!: 'healthy' | 'degraded' | 'unhealthy';

  @ApiProperty({
    description: 'Estado dos componentes',
    example: {
      bigquery: { status: 'ok', latency: 45 },
      pinecone: { status: 'ok', latency: 120 },
      vertexAi: { status: 'ok', latency: 350 }
    }
  })
  components!: {
    [key: string]: {
      status: 'ok' | 'error' | 'warning';
      latency: number;
    };
  };

  @ApiProperty({
    description: 'Estado dos recursos',
    example: {
      cpu: { usage: 45, status: 'ok' },
      memory: { usage: 1024, status: 'ok' }
    }
  })
  resources!: {
    [key: string]: {
      usage: number;
      status: 'ok' | 'warning' | 'error';
    };
  };

  @ApiProperty({
    description: 'Data da última verificação',
    example: '2024-02-26T15:30:00Z'
  })
  lastCheck!: string;
}

export class ProtectedDataResponse {
  @ApiProperty({
    example: 'Dados protegidos acessados com sucesso',
    description: 'Mensagem de sucesso',
    required: true,
  })
  message!: string;

  @ApiProperty({
    type: UserData,
    description: 'Dados do usuário autenticado',
    required: true,
  })
  user!: UserData;

  @ApiProperty({
    example: '2024-02-25T21:00:00Z',
    description: 'Data e hora do acesso',
    format: 'date-time',
    required: true,
  })
  timestamp!: string;
}

export class AdminDataResponse extends ProtectedDataResponse {
  @ApiProperty({
    example: 'admin',
    description: 'Papel do usuário no sistema',
    enum: ['admin'],
    required: true,
  })
  role!: string;
}

@ApiTags('Admin')
@Controller('admin')
@UseGuards(MockAuthGuard, RolesGuard)
@Roles('admin')
@ApiBearerAuth('access-token')
export class AdminController {
  constructor(private readonly orchestratorService: OrchestratorService) {}

  @Get('health')
  @ApiOperation({
    summary: 'Verificar status do sistema',
    description: `
      Retorna informações detalhadas sobre o estado dos componentes do sistema.

      ## Componentes Verificados

      ### Serviços Externos
      - BigQuery
      - Pinecone
      - Vertex AI
      - OpenAI

      ### Componentes Internos
      - API Gateway
      - Orchestrator
      - Cache
      - Query Generator

      ### Recursos
      - CPU
      - Memória
      - Disco
      - Rede
    `
  })
  @ApiResponse({
    status: 200,
    description: 'Sistema operacional',
    type: AdminHealthCheckResponseDto
  })
  @ApiInternalServerErrorResponse()
  async checkHealth(): Promise<HealthCheckResponse> {
    return this.orchestratorService.checkHealth();
  }

  @Get('protected')
  @Roles('user')
  @ApiOperation({
    summary: 'Acessar dados protegidos (usuário)',
    description: 'Endpoint protegido que requer autenticação de usuário',
  })
  @ApiResponse({
    status: 200,
    description: 'Dados acessados com sucesso',
    type: ProtectedDataResponse,
  })
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  getProtectedData(@Request() req: UserRequest): ProtectedDataResponse {
    try {
      return {
        message: 'Dados protegidos acessados com sucesso',
        user: req.user,
        timestamp: new Date().toISOString(),
      };
    } catch (error: unknown) {
      if (error instanceof Error) {
        throw new HttpException(
          error.message,
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }
      throw new HttpException(
        'Erro ao acessar dados protegidos',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('admin')
  @Roles('admin')
  @ApiOperation({
    summary: 'Acessar dados administrativos',
    description: 'Endpoint protegido que requer autenticação de administrador',
  })
  @ApiResponse({
    status: 200,
    description: 'Dados administrativos acessados com sucesso',
    type: AdminDataResponse,
  })
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  getAdminData(@Request() req: UserRequest): AdminDataResponse {
    try {
      return {
        message: 'Dados administrativos acessados com sucesso',
        user: req.user,
        timestamp: new Date().toISOString(),
        role: 'admin',
      };
    } catch (error: unknown) {
      if (error instanceof Error) {
        throw new HttpException(
          error.message,
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }
      throw new HttpException(
        'Erro ao acessar dados administrativos',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('metrics')
  @ApiOperation({
    summary: 'Obtém métricas do sistema',
    description: `
      Retorna métricas detalhadas sobre o funcionamento do sistema.

      ## Métricas Disponíveis

      ### Performance
      - Tempo médio de resposta
      - Taxa de hit/miss do cache
      - Consumo de recursos
      - Latência por componente

      ### Qualidade
      - Taxa de feedback positivo
      - Precisão das respostas
      - Taxa de abandono
      - Tempo médio de sessão

      ### Custos
      - Consumo de APIs externas
      - Processamento BigQuery
      - Armazenamento Pinecone

      ### Utilização
      - Usuários ativos
      - Consultas por hora
      - Distribuição por tipo de consulta
    `
  })
  @ApiQuery({
    name: 'startDate',
    required: false,
    type: String,
    description: 'Data inicial para filtrar métricas (ISO 8601)',
    example: '2024-01-01T00:00:00Z'
  })
  @ApiQuery({
    name: 'endDate',
    required: false,
    type: String,
    description: 'Data final para filtrar métricas (ISO 8601)',
    example: '2024-01-31T23:59:59Z'
  })
  @ApiResponse({
    status: 200,
    description: 'Métricas obtidas com sucesso',
    type: AdminMetricsResponseDto
  })
  async getMetrics(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string
  ): Promise<MetricsResponse> {
    return this.orchestratorService.getMetrics(startDate, endDate);
  }

  @Get('templates')
  @ApiOperation({
    summary: 'Lista templates de cache',
    description: `
      Retorna os templates armazenados no cache semântico.

      ## Informações Retornadas
      - ID do template
      - Pergunta original
      - Query SQL gerada
      - Métricas de uso
      - Histórico de feedback

      ## Filtros Disponíveis
      - Por período
      - Por tipo de consulta
      - Por performance
      - Por feedback
    `
  })
  @ApiQuery({
    name: 'type',
    required: false,
    description: 'Tipo de template para filtrar',
    example: 'sales_analysis'
  })
  @ApiQuery({
    name: 'minConfidence',
    required: false,
    type: Number,
    description: 'Confiança mínima (0-1)',
    example: 0.85
  })
  @ApiResponse({
    status: 200,
    description: 'Templates listados com sucesso',
    type: AdminTemplateListResponseDto
  })
  async listTemplates(
    @Query('type') type?: string,
    @Query('minConfidence') minConfidence?: number
  ): Promise<TemplateListResponse> {
    return this.orchestratorService.listTemplates(type, minConfidence);
  }

  @Put('templates/:id')
  @ApiOperation({
    summary: 'Atualiza um template',
    description: `
      Atualiza um template específico no cache semântico.

      ## Campos Atualizáveis
      - Query SQL
      - Resposta padrão
      - Metadados
      - Configurações de cache

      ## Impacto
      A atualização de um template afeta:
      - Respostas futuras para perguntas similares
      - Performance do cache
      - Qualidade das respostas
    `
  })
  @ApiParam({
    name: 'id',
    description: 'ID do template',
    example: 'template_123'
  })
  @ApiBody({
    type: AdminTemplateUpdateRequestDto,
    description: 'Dados para atualização do template'
  })
  @ApiResponse({
    status: 200,
    description: 'Template atualizado com sucesso',
    type: AdminTemplateDto
  })
  async updateTemplate(
    @Param('id') id: string,
    @Body() template: TemplateUpdateRequest
  ): Promise<Template> {
    return this.orchestratorService.updateTemplate(id, template);
  }

  @Delete('templates/:id')
  @ApiOperation({
    summary: 'Remove um template',
    description: `
      Remove um template específico do cache semântico.

      ## Considerações
      - A remoção é permanente
      - Afeta respostas futuras
      - Pode impactar performance

      ## Casos de Uso
      - Templates obsoletos
      - Respostas incorretas
      - Otimização de cache
    `
  })
  @ApiParam({
    name: 'id',
    description: 'ID do template',
    example: 'template_123'
  })
  @ApiResponse({
    status: 200,
    description: 'Template removido com sucesso'
  })
  @ApiResponse({
    status: 404,
    description: 'Template não encontrado'
  })
  async deleteTemplate(@Param('id') id: string): Promise<void> {
    return this.orchestratorService.deleteTemplate(id);
  }

  @Post('cache/clear')
  @ApiOperation({
    summary: 'Limpa o cache semântico',
    description: `
      Limpa todo ou parte do cache semântico.

      ## Opções de Limpeza
      - Cache completo
      - Por tipo de template
      - Por período
      - Por performance

      ## Impacto
      - Performance temporariamente reduzida
      - Reaprendizado necessário
      - Aumento de custos de API
    `
  })
  @ApiBody({
    type: AdminCacheClearOptionsDto,
    description: 'Opções para limpeza do cache'
  })
  @ApiResponse({
    status: 200,
    description: 'Cache limpo com sucesso',
    type: AdminCacheClearResponseDto
  })
  async clearCache(@Body() options: CacheClearOptions): Promise<CacheClearResponse> {
    return this.orchestratorService.clearCache(options);
  }
}
