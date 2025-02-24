import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { OpenAIApiService } from './openai-api.service';

@Module({
  imports: [ConfigModule],
  providers: [OpenAIApiService],
  exports: [OpenAIApiService],
})
export class OpenAIModule {} 