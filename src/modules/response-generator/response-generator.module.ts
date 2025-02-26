import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { OpenAIModule } from '../../integrations/openai/openai.module';
import { ResponseGeneratorService } from './services/response-generator.service';

@Module({
  imports: [ConfigModule, OpenAIModule],
  providers: [ResponseGeneratorService],
  exports: [ResponseGeneratorService],
})
export class ResponseGeneratorModule {}
