import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { FeedbackService } from '../services/feedback.service';
import { FeedbackDto } from '../dtos/feedback.dto';
import { ClerkGuard } from '../../api-gateway/clerk/clerk.guard';

@Controller('feedback')
export class FeedbackController {
  constructor(private readonly feedbackService: FeedbackService) {}

  /**
   * Endpoint para enviar feedback
   * @param feedback Feedback do usuário
   * @returns Confirmação de processamento
   */
  @Post()
  @UseGuards(ClerkGuard)
  async submitFeedback(@Body() feedback: FeedbackDto) {
    return this.feedbackService.processFeedback(feedback);
  }

  /**
   * Endpoint para obter métricas de feedback (apenas para administradores)
   * @returns Métricas de feedback
   */
  @Get('analytics')
  @UseGuards(ClerkGuard)
  async getAnalytics() {
    return {
      analytics: this.feedbackService.getAnalytics(),
      patterns: this.feedbackService.identifyNegativeFeedbackPatterns(),
    };
  }
} 