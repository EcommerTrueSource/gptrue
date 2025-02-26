import {
  IsString,
  IsOptional,
  IsBoolean,
  IsUUID,
  IsObject,
  ValidateNested,
  MaxLength,
  IsEnum,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum FeedbackType {
  HELPFUL = 'helpful',
  NOT_HELPFUL = 'not_helpful',
  INCORRECT = 'incorrect',
  INCOMPLETE = 'incomplete',
  OTHER = 'other',
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

export class FeedbackRequestDto {
  @IsUUID()
  @ApiProperty({ description: 'ID da conversação' })
  conversationId: string;

  @IsUUID()
  @ApiProperty({ description: 'ID da resposta que recebeu feedback' })
  responseId: string;

  @IsEnum(FeedbackType)
  @ApiProperty({
    enum: FeedbackType,
    description: 'Tipo do feedback',
    example: FeedbackType.HELPFUL,
  })
  type: FeedbackType;

  @IsBoolean()
  @ApiProperty({ description: 'Indica se a resposta foi útil' })
  helpful: boolean;

  @IsOptional()
  @ValidateNested()
  @Type(() => FeedbackMetadata)
  @ApiPropertyOptional({ type: FeedbackMetadata })
  metadata?: FeedbackMetadata;
}
