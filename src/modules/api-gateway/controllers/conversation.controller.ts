import { Controller, Post, Body, UseGuards, Request } from '@nestjs/common';
import { ClerkGuard } from '../clerk/clerk.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { OrchestratorService } from '../../orchestrator/services/orchestrator.service';

export class ConversationDto {
  message: string;
  user?: any;
}

@Controller('conversation')
@UseGuards(ClerkGuard, RolesGuard)
export class ConversationController {
  constructor(private readonly orchestratorService: OrchestratorService) {}

  @Post()
  @Roles('user')
  async sendMessage(@Body() dto: ConversationDto, @Request() req) {
    dto.user = req.user;
    return this.orchestratorService.processConversation(dto);
  }
}
