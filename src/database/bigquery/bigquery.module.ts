import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { BigQueryService } from './bigquery.service';
import { BIGQUERY_SERVICE } from './interfaces/bigquery.interface';

@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: BIGQUERY_SERVICE,
      useClass: BigQueryService
    }
  ],
  exports: [BIGQUERY_SERVICE],
})
export class BigQueryModule {}
