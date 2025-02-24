import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ApiGatewayModule } from './modules/api-gateway/api-gateway.module';
import { OrchestratorModule } from './modules/orchestrator/orchestrator.module';
import { ClerkGuard } from './modules/api-gateway/clerk/clerk.guard';
import appConfig from './config/app.config';
import bigqueryConfig from './config/bigquery.config';
import pineconeConfig from './config/pinecone.config';
import aiConfig from './config/ai.config';
import { BigQueryModule } from './database/bigquery/bigquery.module';
import { PineconeModule } from './database/pinecone/pinecone.module';
import { OpenAIModule } from './integrations/openai/openai.module';
import { VertexAIModule } from './integrations/vertex-ai/vertex-ai.module';
import { FeedbackModule } from './modules/feedback/feedback.module';
import { QueueModule } from './common/queue/queue.module';
import { RedisCacheModule } from './common/cache/redis-cache.module';
import { MonitoringModule } from './common/monitoring/monitoring.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig, bigqueryConfig, pineconeConfig, aiConfig],
    }),
    ApiGatewayModule,
    OrchestratorModule,
    BigQueryModule,
    PineconeModule,
    OpenAIModule,
    VertexAIModule,
    FeedbackModule,
    QueueModule,
    RedisCacheModule,
    MonitoringModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: ClerkGuard,
    },
  ],
})
export class AppModule {} 