import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { QueryProcessor } from './processors/query-processor';
import { ResponseProcessor } from './processors/response-processor';
import { BigQueryModule } from '../../database/bigquery/bigquery.module';
import { ResponseGeneratorModule } from '../../modules/response-generator/response-generator.module';

@Module({
  imports: [
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        redis: {
          host: configService.get<string>('app.redis.host') || 'localhost',
          port: configService.get<number>('app.redis.port') || 6379,
          password: configService.get<string>('app.redis.password'),
        },
        defaultJobOptions: {
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 1000,
          },
          removeOnComplete: true,
          removeOnFail: false,
        },
      }),
    }),
    BullModule.registerQueue(
      {
        name: 'query-processing',
      },
      {
        name: 'response-generation',
      },
    ),
    BigQueryModule,
    ResponseGeneratorModule,
  ],
  providers: [QueryProcessor, ResponseProcessor],
  exports: [BullModule],
})
export class QueueModule {}
