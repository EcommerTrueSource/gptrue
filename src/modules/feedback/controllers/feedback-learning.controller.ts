import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery } from '@nestjs/swagger';
import { FeedbackLearningService } from '../services/feedback-learning.service';
import { FeedbackAnalytics, FeedbackPattern } from '../interfaces/feedback.interface';
import { Template } from '../../orchestrator/interfaces/orchestrator.interface';

@ApiTags('feedback-learning')
@Controller('api/feedback-learning')
export class FeedbackLearningController {
  constructor(private readonly feedbackLearningService: FeedbackLearningService) {}

  @Get('analytics')
  @ApiOperation({ summary: 'Obter análise de feedback' })
  @ApiResponse({
    status: 200,
    description: 'Análise de feedback com estatísticas e padrões identificados',
    type: Object
  })
  async getFeedbackAnalytics(): Promise<FeedbackAnalytics> {
    return this.feedbackLearningService.analyzeFeedback();
  }

  @Get('patterns')
  @ApiOperation({ summary: 'Obter padrões de feedback' })
  @ApiResponse({
    status: 200,
    description: 'Lista de padrões de feedback identificados',
    type: Array
  })
  async getFeedbackPatterns(): Promise<FeedbackPattern[]> {
    return this.feedbackLearningService.identifyFeedbackPatterns();
  }

  @Get('templates-for-review')
  @ApiOperation({ summary: 'Obter templates que precisam de revisão' })
  @ApiQuery({
    name: 'threshold',
    required: false,
    type: Number,
    description: 'Limite mínimo de feedback negativo para considerar revisão (padrão: 30%)'
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de templates que precisam de revisão',
    type: Array
  })
  async getTemplatesForReview(@Query('threshold') threshold?: number): Promise<Template[]> {
    return this.feedbackLearningService.identifyTemplatesForReview(threshold ? Number(threshold) : undefined);
  }

  @Get('report')
  @ApiOperation({ summary: 'Gerar relatório de aprendizado de feedback' })
  @ApiResponse({
    status: 200,
    description: 'Relatório com insights e recomendações',
    type: String
  })
  async getLearningReport(): Promise<string> {
    return this.feedbackLearningService.generateLearningReport();
  }
}
