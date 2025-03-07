import { IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { FeedbackType } from './feedback-request.dto';

/**
 * DTO simplificado para feedback
 * Compatível com o formato atual enviado pelos clientes
 */
export class SimpleFeedbackDto {
  @IsUUID()
  @ApiProperty({
    description: 'ID da mensagem que está recebendo feedback',
    example: '8690f760-7787-40e8-a8ed-481d62fba89b'
  })
  messageId: string;

  @ApiProperty({
    description: 'Tipo do feedback',
    enum: FeedbackType,
    example: FeedbackType.POSITIVE
  })
  @IsEnum(FeedbackType)
  type: FeedbackType;

  @ApiPropertyOptional({
    description: 'Comentário adicional sobre o feedback',
    example: 'A resposta foi muito útil, mas poderia incluir mais detalhes.'
  })
  @IsString()
  @IsOptional()
  comment?: string;
}
