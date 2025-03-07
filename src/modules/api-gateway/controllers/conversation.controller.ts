import { Controller, Post, Body, UseGuards, Request, Get, Param, Put } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiBody, ApiParam } from '@nestjs/swagger';
import { MockAuthGuard } from '../../../common/guards/mock-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { OrchestratorService } from '../../orchestrator/services/orchestrator.service';
import { ConversationRequestDto, ConversationResponseDto } from '../dtos/conversation.dto';
import { FeedbackRequestDto, FeedbackResponseDto, FeedbackType } from '../dtos/feedback-request.dto';
import { SimpleFeedbackDto } from '../dtos/simple-feedback.dto';
import { Logger } from '@nestjs/common';

@ApiTags('Conversação')
@Controller('conversation')
@UseGuards(MockAuthGuard, RolesGuard)
@ApiBearerAuth('access-token')
export class ConversationController {
  private readonly logger = new Logger(ConversationController.name);

  constructor(private readonly orchestratorService: OrchestratorService) {}

  @Post()
  @Roles('user')
  @ApiOperation({
    summary: 'Envia uma nova mensagem para o chatbot',
    description: `
      Processa uma pergunta do usuário em linguagem natural e retorna uma resposta baseada nos dados do e-commerce.

      ## Funcionalidades
      - Processamento de linguagem natural
      - Geração dinâmica de consultas SQL
      - Cache semântico para respostas similares
      - Sugestões de perguntas relacionadas

      ## Exemplos de Perguntas
      - "Quais foram os 5 produtos mais vendidos no último mês?"
      - "Qual o ticket médio dos pedidos em janeiro?"
      - "Como está a taxa de conversão de assinaturas?"

      ## Observações
      - O contexto da conversa é mantido através do conversationId
      - Filtros e período de análise podem ser especificados no contexto
      - Respostas incluem dados estruturados e sugestões relacionadas
    `
  })
  @ApiBody({
    type: ConversationRequestDto,
    description: 'Dados da pergunta do usuário'
  })
  @ApiResponse({
    status: 201,
    description: 'Resposta processada com sucesso',
    type: ConversationResponseDto
  })
  @ApiResponse({
    status: 400,
    description: 'Requisição inválida',
    schema: {
      example: {
        statusCode: 400,
        message: 'Pergunta muito curta ou inválida',
        error: 'Bad Request'
      }
    }
  })
  @ApiResponse({
    status: 401,
    description: 'Não autorizado',
    schema: {
      example: {
        statusCode: 401,
        message: 'Token inválido ou expirado',
        error: 'Unauthorized'
      }
    }
  })
  async sendMessage(@Body() dto: ConversationRequestDto) {
    return this.orchestratorService.processConversation(dto);
  }

  @Get(':id')
  @Roles('user')
  @ApiOperation({
    summary: 'Recupera uma conversa específica',
    description: 'Retorna os detalhes de uma conversa pelo seu ID, incluindo histórico de mensagens e contexto.'
  })
  @ApiParam({
    name: 'id',
    description: 'ID da conversa',
    example: 'conv_123456789'
  })
  @ApiResponse({
    status: 200,
    description: 'Conversa encontrada',
    type: ConversationResponseDto
  })
  @ApiResponse({
    status: 404,
    description: 'Conversa não encontrada',
    schema: {
      example: {
        statusCode: 404,
        message: 'Conversa não encontrada',
        error: 'Not Found'
      }
    }
  })
  async getConversation(@Param('id') id: string) {
    return this.orchestratorService.getConversation(id);
  }

  @Put(':id/feedback')
  @Roles('user')
  @ApiOperation({
    summary: 'Enviar feedback para uma resposta',
    description: 'Permite que o usuário forneça feedback sobre uma resposta específica',
  })
  @ApiParam({
    name: 'id',
    description: 'ID da conversa',
    type: String,
  })
  @ApiBody({
    type: SimpleFeedbackDto,
    description: 'Dados do feedback',
  })
  @ApiResponse({
    status: 200,
    description: 'Feedback processado com sucesso',
    type: FeedbackResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Dados de feedback inválidos',
  })
  @ApiResponse({
    status: 404,
    description: 'Conversa ou resposta não encontrada',
  })
  async sendFeedback(
    @Param('id') id: string,
    @Body() simpleFeedback: SimpleFeedbackDto,
  ): Promise<FeedbackResponseDto> {
    this.logger.log(`Recebendo feedback para conversa ${id}`);

    // Converter SimpleFeedbackDto para FeedbackRequestDto
    const feedback: FeedbackRequestDto = {
      conversationId: id,
      responseId: simpleFeedback.messageId,
      type: simpleFeedback.type,
      helpful: simpleFeedback.type === 'positive',
      comment: simpleFeedback.comment,
    };

    return this.orchestratorService.processFeedback(feedback);
  }
}
