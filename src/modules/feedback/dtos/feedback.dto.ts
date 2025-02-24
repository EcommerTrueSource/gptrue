import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';

/**
 * Enum para tipos de feedback
 */
export enum FeedbackType {
  POSITIVE = 'positive',
  NEGATIVE = 'negative',
}

/**
 * DTO para feedback
 */
export class FeedbackDto {
  @IsNotEmpty({ message: 'A pergunta é obrigatória' })
  @IsString({ message: 'A pergunta deve ser uma string' })
  question: string;

  @IsNotEmpty({ message: 'O tipo de feedback é obrigatório' })
  @IsEnum(FeedbackType, { message: 'Tipo de feedback inválido' })
  type: 'positive' | 'negative';

  @IsOptional()
  @IsString({ message: 'O comentário deve ser uma string' })
  comment?: string;

  @IsOptional()
  @IsString({ message: 'A categoria deve ser uma string' })
  category?: string;

  @IsOptional()
  @IsString({ message: 'O ID da conversa deve ser uma string' })
  conversationId?: string;
} 