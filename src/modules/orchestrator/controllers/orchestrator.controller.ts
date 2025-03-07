import { Controller, Post, Body, Get, Param, Put } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBody } from '@nestjs/swagger';
import { OrchestratorService } from '../services/orchestrator.service';
import {
  ConversationRequestDto,
  ConversationResponseDto,
} from '../../api-gateway/dtos/conversation.dto';
import { FeedbackRequestDto, FeedbackResponseDto } from '../../api-gateway/dtos/feedback-request.dto';

@ApiTags('Orchestrator')
@Controller('orchestrator')
export class OrchestratorController {
  constructor(private readonly orchestratorService: OrchestratorService) {}

  @Post()
  async processConversation(@Body() request: ConversationRequestDto): Promise<ConversationResponseDto> {
    return this.orchestratorService.processConversation(request);
  }

  @Get(':id')
  async getConversation(@Param('id') id: string): Promise<ConversationResponseDto> {
    return this.orchestratorService.getConversation(id);
  }

  @Post('feedback/:id')
  @ApiOperation({
    summary: 'Processa feedback de uma resposta',
    description: 'Registra e processa o feedback do usuário sobre uma resposta específica'
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
  async processFeedback(
    @Param('id') id: string,
    @Body() feedback: FeedbackRequestDto
  ): Promise<FeedbackResponseDto> {
    if (!feedback.conversationId) {
      feedback.conversationId = id;
    }
    return this.orchestratorService.processFeedback(feedback);
  }
}
