import { Controller, Post, Body, UseGuards, Request, Get, Param, Put } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiBody, ApiParam } from '@nestjs/swagger';
import { MockAuthGuard } from '../../../common/guards/mock-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { OrchestratorService } from '../../orchestrator/services/orchestrator.service';
import { ConversationRequestDto, ConversationResponseDto } from '../dtos/conversation.dto';
import { FeedbackRequestDto, FeedbackResponseDto } from '../dtos/feedback-request.dto';

@ApiTags('Conversação')
@Controller('conversation')
@UseGuards(MockAuthGuard, RolesGuard)
@ApiBearerAuth('access-token')
export class ConversationController {
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
    summary: 'Envia feedback sobre uma resposta',
    description: `
      Registra o feedback do usuário sobre uma resposta específica.
      O feedback ajuda a melhorar a qualidade das respostas futuras.

      ## Tipos de Feedback
      - Positivo: Resposta útil e correta
      - Negativo: Resposta incorreta ou insuficiente
      - Neutro: Resposta parcialmente útil

      ## Impacto do Feedback
      - Atualização do cache semântico
      - Ajuste de templates de resposta
      - Geração de métricas de qualidade
      - Identificação de áreas para melhoria
    `
  })
  @ApiParam({
    name: 'id',
    description: 'ID da conversa',
    example: 'conv_123456789'
  })
  @ApiBody({
    type: FeedbackRequestDto,
    description: 'Dados do feedback'
  })
  @ApiResponse({
    status: 200,
    description: 'Feedback processado com sucesso',
    type: FeedbackResponseDto
  })
  async sendFeedback(
    @Param('id') id: string,
    @Body() feedback: FeedbackRequestDto
  ) {
    return this.orchestratorService.processFeedback(id, feedback);
  }
}
