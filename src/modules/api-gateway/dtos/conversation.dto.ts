import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsObject,
  ValidateNested,
  IsNumber,
  IsBoolean,
  IsArray,
  IsEnum,
  IsDateString,
} from 'class-validator';
import { Type } from 'class-transformer';

export class TimeRangeDto {
  @ApiProperty({
    description: 'Data de início do período de análise',
    example: '2024-01-01T00:00:00Z',
    format: 'date-time'
  })
  @IsDateString()
  start: string;

  @ApiProperty({
    description: 'Data de fim do período de análise',
    example: '2024-01-31T23:59:59Z',
    format: 'date-time'
  })
  @IsDateString()
  end: string;
}

export class QueryOptionsDto {
  @ApiPropertyOptional({
    description: 'Número máximo de linhas a serem retornadas na consulta',
    example: 100,
    minimum: 1,
    maximum: 1000,
    default: 100
  })
  @IsNumber()
  @IsOptional()
  maxResultRows?: number;

  @ApiPropertyOptional({
    description: 'Se deve incluir a query SQL gerada na resposta',
    example: true,
    default: false
  })
  @IsBoolean()
  @IsOptional()
  includeSql?: boolean;

  @ApiPropertyOptional({
    description: 'Timeout personalizado para a execução da query em milissegundos',
    example: 30000,
    minimum: 1000,
    maximum: 60000,
    default: 30000
  })
  @IsNumber()
  @IsOptional()
  timeout?: number;
}

export class ConversationContextDto {
  @ApiPropertyOptional({
    description: 'Filtros adicionais para a consulta',
    example: {
      categoria: 'suplementos',
      marca: 'True Source'
    }
  })
  @IsObject()
  @IsOptional()
  filters?: Record<string, any>;

  @ApiPropertyOptional({
    type: TimeRangeDto,
    description: 'Período de tempo para análise dos dados'
  })
  @ValidateNested()
  @Type(() => TimeRangeDto)
  @IsOptional()
  timeRange?: TimeRangeDto;

  @ApiPropertyOptional({
    description: 'Tipo de visualização preferida para os resultados',
    example: 'table',
    enum: ['table', 'chart', 'summary'],
    default: 'table'
  })
  @IsEnum(['table', 'chart', 'summary'])
  @IsOptional()
  preferredVisualization?: string;
}

export class ConversationRequestDto {
  @ApiProperty({
    description: 'Pergunta ou comando do usuário em linguagem natural',
    example: 'Quais foram os 5 produtos mais vendidos no último mês?',
    minLength: 3,
    maxLength: 500
  })
  @IsString()
  message: string;

  @ApiPropertyOptional({
    description: 'ID da conversa para manter contexto (opcional)',
    example: 'conv_123456789'
  })
  @IsString()
  @IsOptional()
  conversationId?: string;

  @ApiPropertyOptional({
    description: 'ID do usuário que está fazendo a pergunta',
    example: 'user_123456789'
  })
  @IsString()
  @IsOptional()
  userId?: string;

  @ApiPropertyOptional({
    type: ConversationContextDto,
    description: 'Contexto adicional para a consulta'
  })
  @ValidateNested()
  @Type(() => ConversationContextDto)
  @IsOptional()
  context?: ConversationContextDto;

  @ApiPropertyOptional({
    type: QueryOptionsDto,
    description: 'Opções para execução da query'
  })
  @ValidateNested()
  @Type(() => QueryOptionsDto)
  @IsOptional()
  options?: QueryOptionsDto;
}

export class QueryMetadataDto {
  @ApiProperty({
    description: 'Tempo de processamento em milissegundos',
    example: 245
  })
  processingTimeMs: number;

  @ApiProperty({
    description: 'Fonte da resposta (cache ou consulta)',
    example: 'cache',
    enum: ['cache', 'query']
  })
  source: 'cache' | 'query';

  @ApiProperty({
    description: 'Nível de confiança na resposta (0-1)',
    example: 0.95,
    minimum: 0,
    maximum: 1
  })
  confidence: number;

  @ApiPropertyOptional({
    description: 'Tabelas utilizadas na consulta',
    example: ['PEDIDOS', 'PRODUTOS']
  })
  @IsArray()
  @IsOptional()
  tables?: string[];

  @ApiPropertyOptional({
    description: 'Query SQL gerada (se solicitado)',
    example: 'SELECT produto, COUNT(*) as total FROM pedidos GROUP BY produto LIMIT 5'
  })
  @IsString()
  @IsOptional()
  sql?: string;
}

export class ConversationResponseDto {
  @ApiProperty({
    description: 'ID único da resposta',
    example: 'resp_123456789'
  })
  id: string;

  @ApiProperty({
    description: 'ID da conversa',
    example: 'conv_123456789'
  })
  conversationId: string;

  @ApiProperty({
    description: 'Resposta em linguagem natural',
    example: 'Os 5 produtos mais vendidos no último mês foram: 1. Produto A (150 unidades), 2. Produto B (120 unidades)...'
  })
  message: string;

  @ApiProperty({
    type: QueryMetadataDto,
    description: 'Metadados da consulta e processamento'
  })
  metadata: QueryMetadataDto;

  @ApiPropertyOptional({
    description: 'Dados estruturados da resposta',
    example: {
      type: 'table',
      content: [
        { produto: 'Produto A', vendas: 150 },
        { produto: 'Produto B', vendas: 120 }
      ]
    }
  })
  data?: {
    type: 'table' | 'scalar' | 'chart';
    content: any;
  };

  @ApiPropertyOptional({
    description: 'Sugestões de perguntas relacionadas',
    example: [
      'Qual o faturamento total desses produtos?',
      'Como essas vendas se comparam com o mês anterior?'
    ]
  })
  suggestions?: string[];

  @ApiProperty({
    description: 'Opções de feedback disponíveis',
    example: {
      thumbsUp: true,
      thumbsDown: true,
      commentEnabled: true
    }
  })
  feedbackOptions: {
    thumbsUp: boolean;
    thumbsDown: boolean;
    commentEnabled: boolean;
  };
}
