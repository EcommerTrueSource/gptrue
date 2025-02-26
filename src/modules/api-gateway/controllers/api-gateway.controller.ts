import {
  Controller,
  Post,
  Body,
  UseGuards,
  Get,
  Query,
  UseInterceptors,
  Request,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { ApiGatewayService } from '../services/api-gateway.service';
import { ConversationRequestDto } from '../dtos/conversation-request.dto';
import { ConversationResponseDto } from '../dtos/conversation-response.dto';
import { FeedbackRequestDto } from '../dtos/feedback-request.dto';
import { RateLimitInterceptor } from '../../../common/interceptors/rate-limit.interceptor';
import { LoggingInterceptor } from '../../../common/interceptors/logging.interceptor';
import { ClerkGuard } from '../clerk/clerk.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { RequestWithUser } from '../clerk/interfaces/request.interface';

@Controller('conversation')
@ApiTags('Conversação')
@UseInterceptors(RateLimitInterceptor, LoggingInterceptor)
export class ConversationController {
  constructor(private readonly apiGatewayService: ApiGatewayService) {}

  @Post()
  @UseGuards(ClerkGuard, RolesGuard)
  @ApiOperation({ summary: 'Criar uma nova conversação' })
  @ApiResponse({ status: 201, type: ConversationResponseDto })
  @ApiResponse({ status: 400, description: 'Requisição inválida' })
  @ApiResponse({ status: 401, description: 'Não autorizado' })
  async createConversation(
    @Body() conversationRequest: ConversationRequestDto,
  ): Promise<ConversationResponseDto> {
    try {
      return await this.apiGatewayService.handleConversation(
        conversationRequest,
      );
    } catch (error: unknown) {
      const err = error as { message?: string; status?: number };
      throw new HttpException(
        err.message || 'Erro ao processar conversação',
        err.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('history')
  @UseGuards(ClerkGuard, RolesGuard)
  @ApiOperation({ summary: 'Obter histórico de conversação' })
  @ApiResponse({ status: 200, type: [ConversationResponseDto] })
  @ApiResponse({ status: 400, description: 'ID de conversação inválido' })
  @ApiResponse({ status: 401, description: 'Não autorizado' })
  async getConversationHistory(
    @Query('conversationId') conversationId: string,
  ): Promise<ConversationResponseDto[]> {
    try {
      if (!conversationId) {
        throw new HttpException(
          'ID de conversação é obrigatório',
          HttpStatus.BAD_REQUEST,
        );
      }
      return await this.apiGatewayService.getConversationHistory(
        conversationId,
      );
    } catch (error: unknown) {
      const err = error as { message?: string; status?: number };
      throw new HttpException(
        err.message || 'Erro ao obter histórico',
        err.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('feedback')
  @UseGuards(ClerkGuard, RolesGuard)
  @ApiOperation({ summary: 'Enviar feedback sobre uma resposta' })
  @ApiResponse({ status: 201, description: 'Feedback recebido com sucesso' })
  @ApiResponse({ status: 400, description: 'Feedback inválido' })
  @ApiResponse({ status: 401, description: 'Não autorizado' })
  async submitFeedback(
    @Body() feedbackRequest: FeedbackRequestDto,
  ): Promise<{ success: boolean; message: string }> {
    try {
      await this.apiGatewayService.handleFeedback(feedbackRequest);
      return {
        success: true,
        message: 'Feedback recebido com sucesso',
      };
    } catch (error: unknown) {
      const err = error as { message?: string; status?: number };
      throw new HttpException(
        err.message || 'Erro ao processar feedback',
        err.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
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
  getProtectedData(@Request() req: RequestWithUser) {
    return {
      message: 'Dados protegidos acessados com sucesso',
      user: req.user,
    };
  }

  @Get('admin')
  @Roles('admin')
  getAdminData(@Request() req: RequestWithUser) {
    return {
      message: 'Dados administrativos acessados com sucesso',
      user: req.user,
    };
  }
}
