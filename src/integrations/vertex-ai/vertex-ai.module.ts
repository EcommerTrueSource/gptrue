import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { VertexAIService } from './vertex-ai.service';

@Module({
  imports: [ConfigModule],
  providers: [VertexAIService],
  exports: [VertexAIService],
})
export class VertexAIModule {}
