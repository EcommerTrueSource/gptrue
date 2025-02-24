import { IsString, IsOptional, IsObject, ValidateNested, IsNumber, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';

class TimeRangeDto {
  @IsString()
  start: string;

  @IsString()
  end: string;
}

class ContextDto {
  @IsOptional()
  @IsObject()
  filters?: Record<string, any>;

  @IsOptional()
  @ValidateNested()
  @Type(() => TimeRangeDto)
  timeRange?: TimeRangeDto;

  @IsOptional()
  @IsString()
  preferredVisualization?: string;
}

class OptionsDto {
  @IsOptional()
  @IsNumber()
  maxResultRows?: number;

  @IsOptional()
  @IsBoolean()
  includeSql?: boolean;

  @IsOptional()
  @IsNumber()
  timeout?: number;
}

export class ConversationRequestDto {
  @IsString()
  message: string;

  @IsOptional()
  @IsString()
  conversationId?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => ContextDto)
  context?: ContextDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => OptionsDto)
  options?: OptionsDto;
}

export class ConversationResponseDto {
  id: string;
  conversationId: string;
  message: string;
  metadata: {
    processingTimeMs: number;
    source: 'cache' | 'query';
    confidence: number;
    tables?: string[];
    sql?: string;
  };
  data?: {
    type: 'table' | 'scalar' | 'chart';
    content: any;
  };
  suggestions?: string[];
  feedbackOptions: {
    thumbsUp: boolean;
    thumbsDown: boolean;
    commentEnabled: boolean;
  };
} 