import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { RolesGuard } from '../../common/guards/roles.guard';
import { MockAuthGuard } from '../../common/guards/mock-auth.guard';
import { ConversationController } from './controllers/conversation.controller';
import { AdminController } from './controllers/admin.controller';
import { ApiGatewayService } from './services/api-gateway.service';
import { OrchestratorModule } from '../orchestrator/orchestrator.module';
import { HealthController } from './controllers/health.controller';
import { BigQueryModule } from '../../database/bigquery/bigquery.module';
import { VertexAIModule } from '../../integrations/vertex-ai/vertex-ai.module';
import { OpenAIModule } from '../../integrations/openai/openai.module';
import { SemanticCacheModule } from '../semantic-cache/semantic-cache.module';

@Module({
  imports: [
    ConfigModule,
    OrchestratorModule,
    BigQueryModule,
    VertexAIModule,
    OpenAIModule,
    SemanticCacheModule,
  ],
  controllers: [ConversationController, AdminController, HealthController],
  providers: [MockAuthGuard, RolesGuard, ApiGatewayService],
  exports: [MockAuthGuard, RolesGuard, ApiGatewayService],
})
export class ApiGatewayModule {}
