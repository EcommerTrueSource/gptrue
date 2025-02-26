import { Module } from '@nestjs/common';
import { OrchestratorService } from './services/orchestrator.service';
import { BigQueryModule } from '../../database/bigquery/bigquery.module';
import { QueryGeneratorModule } from '../query-generator/query-generator.module';
import { ResponseGeneratorModule } from '../response-generator/response-generator.module';
import { SemanticCacheModule } from '../semantic-cache/semantic-cache.module';
import { QueryValidatorModule } from '../query-validator/query-validator.module';
import { OrchestratorController } from './controllers/orchestrator.controller';

@Module({
  imports: [
    BigQueryModule,
    QueryGeneratorModule,
    ResponseGeneratorModule,
    SemanticCacheModule,
    QueryValidatorModule
  ],
  controllers: [OrchestratorController],
  providers: [OrchestratorService],
  exports: [OrchestratorService],
})
export class OrchestratorModule {}
