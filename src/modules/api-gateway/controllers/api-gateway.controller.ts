import { Controller, Post, Body, UseGuards, Get, Query, UseInterceptors, Request } from '@nestjs/common';
import { ApiGatewayService } from '../services/api-gateway.service';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { ConversationRequestDto } from '../dtos/conversation-request.dto';
import { ConversationResponseDto } from '../dtos/conversation-response.dto';
import { FeedbackRequestDto } from '../dtos/feedback-request.dto';
import { RateLimitInterceptor } from '../../../common/interceptors/rate-limit.interceptor';
import { LoggingInterceptor } from '../../../common/interceptors/logging.interceptor';
import { ClerkGuard } from '../clerk/clerk.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';

@Controller('conversation')
@UseInterceptors(RateLimitInterceptor, LoggingInterceptor)
export class ApiGatewayController {
  constructor(private readonly apiGatewayService: ApiGatewayService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  async createConversation(
    @Body() conversationRequest: ConversationRequestDto,
  ): Promise<ConversationResponseDto> {
    return this.apiGatewayService.handleConversation(conversationRequest);
  }

  @Get('history')
  @UseGuards(JwtAuthGuard)
  async getConversationHistory(
    @Query('conversationId') conversationId: string,
  ): Promise<any> {
    return this.apiGatewayService.getConversationHistory(conversationId);
  }

  @Post('feedback')
  @UseGuards(JwtAuthGuard)
  async submitFeedback(
    @Body() feedbackRequest: FeedbackRequestDto,
  ): Promise<any> {
    return this.apiGatewayService.handleFeedback(feedbackRequest);
  }
}

@Controller('api')
@UseGuards(ClerkGuard, RolesGuard)
export class ApiGatewayController {
  @Get('health')
  healthCheck() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  }

  @Get('protected')
  @Roles('user')
  getProtectedData(@Request() req) {
    return {
      message: 'Dados protegidos acessados com sucesso',
      user: req.user,
    };
  }

  @Get('admin')
  @Roles('admin')
  getAdminData(@Request() req) {
    return {
      message: 'Dados administrativos acessados com sucesso',
      user: req.user,
    };
  }
} 