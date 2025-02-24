import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { BigQueryService } from './bigquery.service';

@Module({
  imports: [ConfigModule],
  providers: [BigQueryService],
  exports: [BigQueryService],
})
export class BigQueryModule {} 