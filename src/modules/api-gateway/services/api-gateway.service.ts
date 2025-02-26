import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ConversationRequestDto } from '../dtos/conversation-request.dto';
import { ConversationResponseDto } from '../dtos/conversation-response.dto';
import { FeedbackRequestDto } from '../dtos/feedback-request.dto';

@Injectable()
export class ApiGatewayService {
  constructor(private readonly configService: ConfigService) {}

  async handleConversation(
    conversationRequest: ConversationRequestDto,
  ): Promise<ConversationResponseDto> {
    // Simula processamento assíncrono
    await Promise.resolve();

    const response = new ConversationResponseDto();
    response.id = '123';

    response.conversationId =
      conversationRequest.conversationId || 'new-conversation';

    response.message = 'Resposta temporária';
    response.metadata = {
      processingTimeMs: 0,
      source: 'cache',
      confidence: 1,
    };
    response.feedbackOptions = {
      thumbsUp: true,
      thumbsDown: true,
      commentEnabled: true,
    };
    return response;
  }

  private async getHistory(
    conversationId: string,
  ): Promise<ConversationResponseDto[]> {
    // Simula busca assíncrona
    await Promise.resolve();

    const response = new ConversationResponseDto();
    response.id = conversationId;
    response.conversationId = conversationId;
    response.message = 'Histórico temporário';
    response.metadata = {
      processingTimeMs: 0,
      source: 'cache',
      confidence: 1,
    };
    response.feedbackOptions = {
      thumbsUp: true,
      thumbsDown: true,
      commentEnabled: true,
    };
    return [response];
  }

  async getConversationHistory(
    conversationId: string,
  ): Promise<ConversationResponseDto[]> {
    return await this.getHistory(conversationId);
  }

  async handleFeedback(feedbackRequest: FeedbackRequestDto): Promise<void> {
    // Simula processamento assíncrono do feedback
    await Promise.resolve();
    console.log('Feedback recebido:', feedbackRequest);
  }
}
