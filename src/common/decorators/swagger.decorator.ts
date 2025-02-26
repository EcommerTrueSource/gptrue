import { applyDecorators, Type } from '@nestjs/common';
import {
  ApiProperty as NestApiProperty,
  ApiPropertyOptions,
  ApiOperation as NestApiOperation,
  ApiResponse as NestApiResponse,
  ApiResponseOptions,
  ApiOperationOptions,
  ApiTags as NestApiTags,
  ApiBearerAuth as NestApiBearerAuth,
} from '@nestjs/swagger';

export function ApiProperty(options: ApiPropertyOptions) {
  return applyDecorators(NestApiProperty(options));
}

export function ApiOperation(options: ApiOperationOptions) {
  return applyDecorators(NestApiOperation(options));
}

export function ApiResponse(options: ApiResponseOptions) {
  return applyDecorators(NestApiResponse(options));
}

export function ApiResponseWithType(
  status: number,
  description: string,
  type?: Type<unknown>,
) {
  return applyDecorators(
    NestApiResponse({
      status,
      description,
      type,
    }),
  );
}

export function ApiErrorResponse(status: number, description: string) {
  return applyDecorators(
    NestApiResponse({
      status,
      description,
    }),
  );
}

export function ApiSuccessResponse(type: Type<unknown>) {
  return applyDecorators(
    NestApiResponse({
      status: 200,
      description: 'Operação realizada com sucesso',
      type,
    }),
  );
}

export function ApiUnauthorizedResponse() {
  return applyDecorators(
    NestApiResponse({
      status: 401,
      description: 'Não autorizado - Token JWT ausente ou inválido',
    }),
  );
}

export function ApiForbiddenResponse() {
  return applyDecorators(
    NestApiResponse({
      status: 403,
      description: 'Acesso proibido - Usuário sem permissão necessária',
    }),
  );
}

export function ApiInternalServerErrorResponse() {
  return applyDecorators(
    NestApiResponse({
      status: 500,
      description: 'Erro interno do servidor',
    }),
  );
}

export function ApiTags(name: string) {
  return applyDecorators(NestApiTags(name));
}

export function ApiBearerAuth(name = 'JWT') {
  return applyDecorators(NestApiBearerAuth(name));
}
