import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { QueryValidatorService } from './services/query-validator.service';

@Module({
  imports: [ConfigModule],
  providers: [QueryValidatorService],
  exports: [QueryValidatorService],
})
export class QueryValidatorModule {} 