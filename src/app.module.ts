import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import configuration from '@config/configuration';
import { ApiGatewayModule } from './modules/api-gateway/api-gateway.module';
import { OrchestratorModule } from './modules/orchestrator/orchestrator.module';
import { SemanticCacheModule } from './modules/semantic-cache/semantic-cache.module';
import { QueryGeneratorModule } from './modules/query-generator/query-generator.module';
import { QueryValidatorModule } from './modules/query-validator/query-validator.module';
import { ResponseGeneratorModule } from './modules/response-generator/response-generator.module';
import { FeedbackModule } from './modules/feedback/feedback.module';
import { BigQueryModule } from './database/bigquery/bigquery.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      load: [configuration],
    }),
    ApiGatewayModule,
    OrchestratorModule,
    SemanticCacheModule,
    QueryGeneratorModule,
    QueryValidatorModule,
    ResponseGeneratorModule,
    FeedbackModule,
    BigQueryModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
