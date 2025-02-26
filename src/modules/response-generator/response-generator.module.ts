import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ResponseGeneratorService } from './services/response-generator.service';
import { OpenAIModule } from '../../integrations/openai/openai.module';

@Module({
  imports: [ConfigModule, OpenAIModule],
  providers: [ResponseGeneratorService],
  exports: [ResponseGeneratorService],
})
export class ResponseGeneratorModule {}
