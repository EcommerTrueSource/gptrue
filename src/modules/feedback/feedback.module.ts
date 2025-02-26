import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { FeedbackService } from './services/feedback.service';
import { FeedbackController } from './controllers/feedback.controller';
import { SemanticCacheModule } from '../semantic-cache/semantic-cache.module';

@Module({
  imports: [ConfigModule, SemanticCacheModule],
  controllers: [FeedbackController],
  providers: [FeedbackService],
  exports: [FeedbackService],
})
export class FeedbackModule {}
