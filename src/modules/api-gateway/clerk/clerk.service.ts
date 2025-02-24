import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

export interface ClerkUser {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  imageUrl?: string;
  roles: string[];
}

@Injectable()
export class ClerkService {
  private readonly clerkApiUrl: string;
  private readonly clerkSecretKey: string;

  constructor(private readonly configService: ConfigService) {
    this.clerkApiUrl = 'https://api.clerk.dev/v1';
    this.clerkSecretKey = this.configService.get<string>('CLERK_SECRET_KEY');
  }

  async validateToken(token: string): Promise<ClerkUser> {
    try {
      const response = await axios.get(`${this.clerkApiUrl}/session`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const { data } = response;
      if (!data || !data.userId) {
        throw new UnauthorizedException('Sessão inválida');
      }

      // Buscar informações detalhadas do usuário
      const userResponse = await axios.get(
        `${this.clerkApiUrl}/users/${data.userId}`,
        {
          headers: {
            Authorization: `Bearer ${this.clerkSecretKey}`,
            'Content-Type': 'application/json',
          },
        },
      );

      const userData = userResponse.data;
      const primaryEmail = userData.emailAddresses.find(
        (email) => email.id === userData.primaryEmailAddressId,
      );

      return {
        id: userData.id,
        email: primaryEmail?.emailAddress,
        firstName: userData.firstName,
        lastName: userData.lastName,
        imageUrl: userData.imageUrl,
        roles: userData.publicMetadata?.roles || ['user'],
      };
    } catch (error) {
      if (error.response?.status === 401) {
        throw new UnauthorizedException('Token inválido ou expirado');
      }
      throw new UnauthorizedException('Erro ao validar token');
    }
  }

  async getUserById(userId: string): Promise<ClerkUser> {
    try {
      const response = await axios.get(`${this.clerkApiUrl}/users/${userId}`, {
        headers: {
          Authorization: `Bearer ${this.clerkSecretKey}`,
          'Content-Type': 'application/json',
        },
      });

      const userData = response.data;
      const primaryEmail = userData.emailAddresses.find(
        (email) => email.id === userData.primaryEmailAddressId,
      );

      return {
        id: userData.id,
        email: primaryEmail?.emailAddress,
        firstName: userData.firstName,
        lastName: userData.lastName,
        imageUrl: userData.imageUrl,
        roles: userData.publicMetadata?.roles || ['user'],
      };
    } catch (error) {
      throw new UnauthorizedException('Usuário não encontrado');
    }
  }
} 