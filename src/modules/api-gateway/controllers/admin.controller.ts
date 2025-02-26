import {
  Controller,
  Get,
  UseGuards,
  Request,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { MockAuthGuard } from '../../../common/guards/mock-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import {
  ApiProperty,
  ApiOperation,
  ApiResponseWithType,
  ApiUnauthorizedResponse,
  ApiForbiddenResponse,
  ApiInternalServerErrorResponse,
  ApiTags,
  ApiBearerAuth,
} from '../../../common/decorators/swagger.decorator';
import { UserRequest, UserData } from '../interfaces/request.interface';

export class HealthCheckResponse {
  @ApiProperty({
    example: 'ok',
    description: 'Status da API',
    enum: ['ok', 'error'],
    required: true,
  })
  status!: string;

  @ApiProperty({
    example: '2024-02-25T21:00:00Z',
    description: 'Data e hora da verificação',
    format: 'date-time',
    required: true,
  })
  timestamp!: string;

  @ApiProperty({
    example: '1.0.0',
    description: 'Versão da API',
    required: true,
  })
  version!: string;
}

export class ProtectedDataResponse {
  @ApiProperty({
    example: 'Dados protegidos acessados com sucesso',
    description: 'Mensagem de sucesso',
    required: true,
  })
  message!: string;

  @ApiProperty({
    type: UserData,
    description: 'Dados do usuário autenticado',
    required: true,
  })
  user!: UserData;

  @ApiProperty({
    example: '2024-02-25T21:00:00Z',
    description: 'Data e hora do acesso',
    format: 'date-time',
    required: true,
  })
  timestamp!: string;
}

export class AdminDataResponse extends ProtectedDataResponse {
  @ApiProperty({
    example: 'admin',
    description: 'Papel do usuário no sistema',
    enum: ['admin'],
    required: true,
  })
  role!: string;
}

@ApiTags('Administração')
@Controller('api')
@ApiBearerAuth('JWT')
@UseGuards(MockAuthGuard, RolesGuard)
export class AdminController {
  @Get('health')
  @ApiOperation({
    summary: 'Verificar status da API',
    description: 'Retorna o status atual da API, timestamp e versão',
  })
  @ApiResponseWithType(200, 'API funcionando normalmente', HealthCheckResponse)
  @ApiInternalServerErrorResponse()
  healthCheck(): HealthCheckResponse {
    try {
      return {
        status: 'ok',
        timestamp: new Date().toISOString(),
        version: process.env.APP_VERSION || '1.0.0',
      };
    } catch (error: unknown) {
      if (error instanceof Error) {
        throw new HttpException(
          error.message,
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }
      throw new HttpException(
        'Erro ao verificar status da API',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('protected')
  @Roles('user')
  @ApiOperation({
    summary: 'Acessar dados protegidos (usuário)',
    description: 'Endpoint protegido que requer autenticação de usuário',
  })
  @ApiResponseWithType(
    200,
    'Dados acessados com sucesso',
    ProtectedDataResponse,
  )
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  getProtectedData(@Request() req: UserRequest): ProtectedDataResponse {
    try {
      return {
        message: 'Dados protegidos acessados com sucesso',
        user: req.user,
        timestamp: new Date().toISOString(),
      };
    } catch (error: unknown) {
      if (error instanceof Error) {
        throw new HttpException(
          error.message,
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }
      throw new HttpException(
        'Erro ao acessar dados protegidos',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('admin')
  @Roles('admin')
  @ApiOperation({
    summary: 'Acessar dados administrativos',
    description: 'Endpoint protegido que requer autenticação de administrador',
  })
  @ApiResponseWithType(
    200,
    'Dados administrativos acessados com sucesso',
    AdminDataResponse,
  )
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  getAdminData(@Request() req: UserRequest): AdminDataResponse {
    try {
      return {
        message: 'Dados administrativos acessados com sucesso',
        user: req.user,
        timestamp: new Date().toISOString(),
        role: 'admin',
      };
    } catch (error: unknown) {
      if (error instanceof Error) {
        throw new HttpException(
          error.message,
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }
      throw new HttpException(
        'Erro ao acessar dados administrativos',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
