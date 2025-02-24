import { IsString, IsNumber, IsBoolean, IsOptional, IsArray, ValidateNested, IsObject } from 'class-validator';
import { Type } from 'class-transformer';

class MetadataDto {
  @IsNumber()
  processingTimeMs: number;

  @IsString()
  source: 'cache' | 'query';

  @IsNumber()
  confidence: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tables?: string[];

  @IsOptional()
  @IsString()
  sql?: string;
}

class DataContentDto {
  @IsString()
  type: 'table' | 'scalar' | 'chart';

  @IsObject()
  content: any;
}

class FeedbackOptionsDto {
  @IsBoolean()
  thumbsUp: boolean;

  @IsBoolean()
  thumbsDown: boolean;

  @IsBoolean()
  commentEnabled: boolean;
}

export class ConversationResponseDto {
  @IsString()
  id: string;

  @IsString()
  conversationId: string;

  @IsString()
  message: string;

  @ValidateNested()
  @Type(() => MetadataDto)
  metadata: MetadataDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => DataContentDto)
  data?: DataContentDto;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  suggestions?: string[];

  @ValidateNested()
  @Type(() => FeedbackOptionsDto)
  feedbackOptions: FeedbackOptionsDto;
} 