import { Body, Controller, Get, Post, UseGuards, Inject } from '@nestjs/common';
import { FeedbackService } from '../services/feedback.service';
import { FeedbackDto } from '../dtos/feedback.dto';
import { MockAuthGuard } from '../../../common/guards/mock-auth.guard';
import { FEEDBACK_SERVICE, IFeedbackService } from '../interfaces/feedback.interface';

@Controller('feedback')
export class FeedbackController {
  constructor(
    @Inject(FEEDBACK_SERVICE)
    private readonly feedbackService: IFeedbackService
  ) {}

  /**
   * Endpoint para enviar feedback
   * @param feedback Feedback do usuário
   * @returns Confirmação de processamento
   */
  @Post()
  @UseGuards(MockAuthGuard)
  async submitFeedback(@Body() feedback: FeedbackDto) {
    return this.feedbackService.processFeedback(feedback);
  }

  /**
   * Endpoint para obter métricas de feedback (apenas para administradores)
   * @returns Métricas de feedback
   */
  @Get('analytics')
  @UseGuards(MockAuthGuard)
  async getAnalytics() {
    return {
      analytics: this.feedbackService.getAnalytics(),
      patterns: this.feedbackService.identifyNegativeFeedbackPatterns(),
    };
  }
}
