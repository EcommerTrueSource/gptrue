import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ClerkModule } from './clerk/clerk.module';
import { ClerkGuard } from './clerk/clerk.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { ConversationController } from './controllers/conversation.controller';
import { AdminController } from './controllers/admin.controller';
import { ApiGatewayService } from './services/api-gateway.service';

@Module({
  imports: [ConfigModule, ClerkModule],
  controllers: [ConversationController, AdminController],
  providers: [ClerkGuard, RolesGuard, ApiGatewayService],
  exports: [ClerkGuard, RolesGuard, ApiGatewayService],
})
export class ApiGatewayModule {}
