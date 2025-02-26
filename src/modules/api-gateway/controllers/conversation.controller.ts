import { Controller, Post, Body, UseGuards, Request } from '@nestjs/common';
import { MockAuthGuard } from '../../../common/guards/mock-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { OrchestratorService } from '../../orchestrator/services/orchestrator.service';

export class ConversationDto {
  message: string;
  user?: any;
}

@Controller('conversation')
@UseGuards(MockAuthGuard, RolesGuard)
export class ConversationController {
  constructor(private readonly orchestratorService: OrchestratorService) {}

  @Post()
  @Roles('user')
  async sendMessage(@Body() dto: ConversationDto, @Request() req) {
    dto.user = req.user;
    return this.orchestratorService.processConversation(dto);
  }
}
