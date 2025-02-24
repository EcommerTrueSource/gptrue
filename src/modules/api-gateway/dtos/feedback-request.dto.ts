import { IsString, IsBoolean, IsOptional } from 'class-validator';

export class FeedbackRequestDto {
  @IsString()
  conversationId: string;

  @IsString()
  responseId: string;

  @IsBoolean()
  isPositive: boolean;

  @IsOptional()
  @IsString()
  comment?: string;
} 