import { Module } from '@nestjs/common';
import { OrchestratorService } from './services/orchestrator.service';
import { BigQueryModule } from '../../database/bigquery/bigquery.module';
import { QueryGeneratorModule } from '../query-generator/query-generator.module';
import { ResponseGeneratorModule } from '../response-generator/response-generator.module';

@Module({
  imports: [
    BigQueryModule,
    QueryGeneratorModule,
    ResponseGeneratorModule,
  ],
  providers: [OrchestratorService],
  exports: [OrchestratorService],
})
export class OrchestratorModule {} 