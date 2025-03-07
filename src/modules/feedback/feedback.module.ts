import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { FeedbackService } from './services/feedback.service';
import { FeedbackController } from './controllers/feedback.controller';
import { FeedbackLearningService } from './services/feedback-learning.service';
import { FeedbackLearningController } from './controllers/feedback-learning.controller';
import { SemanticCacheModule } from '../semantic-cache/semantic-cache.module';
import { OpenAIModule } from '../../integrations/openai/openai.module';
import { MonitoringModule } from '../../common/monitoring/monitoring.module';
import { FEEDBACK_SERVICE } from './interfaces/feedback.interface';

@Module({
  imports: [
    ConfigModule,
    ScheduleModule.forRoot(),
    SemanticCacheModule,
    OpenAIModule,
    MonitoringModule,
  ],
  controllers: [
    FeedbackController,
    FeedbackLearningController,
  ],
  providers: [
    {
      provide: FEEDBACK_SERVICE,
      useClass: FeedbackService,
    },
    FeedbackLearningService,
  ],
  exports: [
    FEEDBACK_SERVICE,
    FeedbackLearningService,
  ],
})
export class FeedbackModule {}
