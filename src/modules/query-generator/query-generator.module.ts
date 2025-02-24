import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { QueryGeneratorService } from './services/query-generator.service';
import { VertexAIModule } from '../../integrations/vertex-ai/vertex-ai.module';

@Module({
  imports: [
    ConfigModule,
    VertexAIModule,
  ],
  providers: [QueryGeneratorService],
  exports: [QueryGeneratorService],
})
export class QueryGeneratorModule {} 