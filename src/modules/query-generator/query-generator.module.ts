import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { QueryGeneratorService } from './services/query-generator.service';
import { VertexAIModule } from '../../integrations/vertex-ai/vertex-ai.module';
import { QUERY_GENERATOR_SERVICE } from './interfaces/query-generator.interface';

@Module({
  imports: [ConfigModule, VertexAIModule],
  providers: [
    {
      provide: QUERY_GENERATOR_SERVICE,
      useClass: QueryGeneratorService
    }
  ],
  exports: [QUERY_GENERATOR_SERVICE],
})
export class QueryGeneratorModule {}
