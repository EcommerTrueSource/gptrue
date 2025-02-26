import { Controller, Post, Body, Get, Param, Put } from '@nestjs/common';
import { OrchestratorService } from '../services/orchestrator.service';
import {
  ConversationRequestDto,
  ConversationResponseDto,
} from '../../api-gateway/dtos/conversation.dto';

@Controller('conversation')
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

  @Put(':id/feedback')
  async provideFeedback(
    @Param('id') id: string,
    @Body() feedback: { type: 'positive' | 'negative'; comment?: string },
  ): Promise<void> {
    return this.orchestratorService.processFeedback(id, feedback);
  }
}
