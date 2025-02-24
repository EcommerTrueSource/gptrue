import { Controller, Get, UseGuards, Request } from '@nestjs/common';
import { ClerkGuard } from './clerk.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { RolesGuard } from '../../../common/guards/roles.guard';

@Controller('users')
@UseGuards(ClerkGuard, RolesGuard)
export class ClerkController {
  @Get('me')
  getProfile(@Request() req) {
    return req.user;
  }

  @Get('admin')
  @Roles('admin')
  getAdminProfile(@Request() req) {
    return {
      message: 'Você tem acesso de administrador',
      user: req.user,
    };
  }
} 