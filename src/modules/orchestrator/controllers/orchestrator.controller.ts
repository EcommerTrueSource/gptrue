import { Controller, Post, Body, Get, Param, Put } from '@nestjs/common';
import { OrchestratorService } from '../services/orchestrator.service';
import { ConversationRequest, ConversationResponse } from '../interfaces/conversation.interface';

@Controller('conversation')
export class OrchestratorController {
  constructor(private readonly orchestratorService: OrchestratorService) {}

  @Post()
  async processQuestion(@Body() request: ConversationRequest): Promise<ConversationResponse> {
    return this.orchestratorService.processQuestion(request);
  }

  @Get(':id')
  async getConversation(@Param('id') id: string): Promise<ConversationResponse> {
    // TODO: Implementar recuperação de conversa por ID
    throw new Error('Método não implementado');
  }

  @Put(':id/feedback')
  async provideFeedback(
    @Param('id') id: string,
    @Body() feedback: { type: 'thumbsUp' | 'thumbsDown'; comment?: string },
  ): Promise<void> {
    // TODO: Implementar feedback
    throw new Error('Método não implementado');
  }
} 