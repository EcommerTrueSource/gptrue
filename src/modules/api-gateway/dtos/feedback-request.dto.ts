import {
  IsString,
  IsOptional,
  IsBoolean,
  IsUUID,
  IsObject,
  ValidateNested,
  MaxLength,
  IsEnum,
  IsArray,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum FeedbackType {
  POSITIVE = 'positive',
  NEGATIVE = 'negative',
  NEUTRAL = 'neutral'
}

export class FeedbackMetadata {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  @ApiPropertyOptional({ description: 'Comentário detalhado sobre o feedback' })
  comment?: string;

  @IsOptional()
  @IsObject()
  @ApiPropertyOptional({ description: 'Dados adicionais específicos do feedback' })
  additionalData?: Record<string, unknown>;
}

export class FeedbackDetailsDto {
  @ApiPropertyOptional({
    description: 'Precisão da resposta (1-5)',
    example: 4,
    minimum: 1,
    maximum: 5
  })
  @IsOptional()
  accuracy?: number;

  @ApiPropertyOptional({
    description: 'Clareza da resposta (1-5)',
    example: 5,
    minimum: 1,
    maximum: 5
  })
  @IsOptional()
  clarity?: number;

  @ApiPropertyOptional({
    description: 'Utilidade da resposta (1-5)',
    example: 4,
    minimum: 1,
    maximum: 5
  })
  @IsOptional()
  usefulness?: number;

  @ApiPropertyOptional({
    description: 'Tags específicas para categorizar o feedback',
    example: ['dados_incorretos', 'resposta_incompleta']
  })
  @IsArray()
  @IsOptional()
  tags?: string[];
}

export class FeedbackRequestDto {
  @IsUUID()
  @ApiProperty({ description: 'ID da conversação' })
  conversationId: string;

  @ApiProperty({
    description: 'ID da resposta que está recebendo feedback',
    example: 'resp_123456789'
  })
  @IsString()
  responseId: string;

  @ApiProperty({
    description: 'Tipo do feedback',
    enum: FeedbackType,
    example: FeedbackType.POSITIVE,
    enumName: 'FeedbackType'
  })
  @IsEnum(FeedbackType)
  type: FeedbackType;

  @IsBoolean()
  @ApiProperty({ description: 'Indica se a resposta foi útil' })
  helpful: boolean;

  @ApiPropertyOptional({
    description: 'Comentário adicional sobre o feedback',
    example: 'A resposta foi muito útil, mas poderia incluir mais detalhes sobre o período analisado.'
  })
  @IsString()
  @IsOptional()
  comment?: string;

  @ApiPropertyOptional({
    type: FeedbackDetailsDto,
    description: 'Detalhes específicos do feedback'
  })
  @ValidateNested()
  @Type(() => FeedbackDetailsDto)
  @IsOptional()
  details?: FeedbackDetailsDto;

  @ApiPropertyOptional({
    description: 'Contexto adicional do feedback',
    example: {
      userRole: 'analista',
      department: 'vendas',
      queryContext: {
        timeRange: 'último mês',
        filters: ['categoria: suplementos']
      }
    }
  })
  @IsObject()
  @IsOptional()
  context?: Record<string, any>;

  @IsOptional()
  @ValidateNested()
  @Type(() => FeedbackMetadata)
  @ApiPropertyOptional({ type: FeedbackMetadata })
  metadata?: FeedbackMetadata;
}

export class FeedbackResponseDto {
  @ApiProperty({
    description: 'ID único do feedback',
    example: 'feed_123456789'
  })
  id: string;

  @ApiProperty({
    description: 'ID da resposta que recebeu feedback',
    example: 'resp_123456789'
  })
  responseId: string;

  @ApiProperty({
    description: 'Tipo do feedback',
    enum: FeedbackType,
    example: FeedbackType.POSITIVE
  })
  type: FeedbackType;

  @ApiProperty({
    description: 'Data e hora do registro do feedback',
    example: '2024-02-26T15:30:00Z'
  })
  timestamp: Date;

  @ApiProperty({
    description: 'Status do processamento do feedback',
    example: 'processed',
    enum: ['pending', 'processed', 'failed']
  })
  status: string;

  @ApiPropertyOptional({
    description: 'Ações tomadas com base no feedback',
    example: [
      'Template atualizado no cache',
      'Métricas de qualidade atualizadas'
    ]
  })
  actions?: string[];

  @ApiPropertyOptional({
    description: 'Sugestões geradas com base no feedback',
    example: {
      improvedQuestion: 'Qual foi o faturamento total dos 5 produtos mais vendidos no último mês?',
      relatedQuestions: [
        'Como está a margem de lucro desses produtos?',
        'Qual a tendência de vendas desses produtos nos últimos 6 meses?'
      ]
    }
  })
  suggestions?: {
    improvedQuestion?: string;
    relatedQuestions?: string[];
  };
}
