import { IsString, IsOptional, ValidateNested, IsObject } from 'class-validator';
import { Type } from 'class-transformer';

class TimeRange {
  @IsString()
  start: string;

  @IsString()
  end: string;
}

class Context {
  @IsOptional()
  @ValidateNested()
  @Type(() => TimeRange)
  timeRange?: TimeRange;

  @IsOptional()
  @IsObject()
  filters?: Record<string, any>;
}

export class ConversationRequestDto {
  @IsString()
  message: string;

  @IsOptional()
  @IsString()
  conversationId?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => Context)
  context?: Context;
} 