import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { RolesGuard } from '../../common/guards/roles.guard';
import { MockAuthGuard } from '../../common/guards/mock-auth.guard';
import { ConversationController } from './controllers/conversation.controller';
import { AdminController } from './controllers/admin.controller';
import { ApiGatewayService } from './services/api-gateway.service';
import { OrchestratorModule } from '../orchestrator/orchestrator.module';

@Module({
  imports: [
    ConfigModule,
    OrchestratorModule
  ],
  controllers: [ConversationController, AdminController],
  providers: [MockAuthGuard, RolesGuard, ApiGatewayService],
  exports: [MockAuthGuard, RolesGuard, ApiGatewayService],
})
export class ApiGatewayModule {}
