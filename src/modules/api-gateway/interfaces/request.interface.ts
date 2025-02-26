import { Request } from '@nestjs/common';
import { ApiProperty } from '@nestjs/swagger';

export class UserData {
  @ApiProperty({
    example: 'user-123',
    description: 'Identificador único do usuário',
    required: true,
  })
  id!: string;

  @ApiProperty({
    example: 'user@example.com',
    description: 'Email do usuário',
    required: true,
    format: 'email',
  })
  email!: string;

  @ApiProperty({
    example: ['user', 'admin'],
    description: 'Lista de papéis do usuário no sistema',
    type: [String],
    required: true,
    isArray: true,
  })
  roles!: string[];

  @ApiProperty({
    example: 'João Silva',
    description: 'Nome completo do usuário',
    required: false,
  })
  name?: string;

  @ApiProperty({
    example: '2024-02-25T21:00:00Z',
    description: 'Data da última atualização do perfil',
    required: false,
    format: 'date-time',
  })
  lastUpdated?: string;

  [key: string]: unknown;
}

export interface UserRequest extends Request {
  user: UserData;
}
