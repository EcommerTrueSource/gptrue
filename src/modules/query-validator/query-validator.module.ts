import { Module } from '@nestjs/common';
import { QueryValidatorService } from './services/query-validator.service';
import { BigQueryModule } from '../../database/bigquery/bigquery.module';

@Module({
  imports: [BigQueryModule],
  providers: [QueryValidatorService],
  exports: [QueryValidatorService],
})
export class QueryValidatorModule {}
