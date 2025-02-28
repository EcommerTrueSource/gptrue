import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { BigQueryService } from './services/bigquery.service';
import { BIGQUERY_SERVICE } from './interfaces/bigquery.interface';

@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: BIGQUERY_SERVICE,
      useClass: BigQueryService,
    },
    BigQueryService,
  ],
  exports: [BIGQUERY_SERVICE, BigQueryService],
})
export class BigQueryModule {}
