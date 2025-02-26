import {
  Injectable,
  Inject,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { clerkClient } from '@clerk/clerk-sdk-node';
import {
  ClerkUser,
  ClerkSession,
  ClerkConfig,
} from './interfaces/clerk-types.interface';

@Injectable()
export class ClerkService {
  private readonly logger = new Logger(ClerkService.name);
  private readonly authEnabled: boolean;

  constructor(
    @Inject('CLERK_CONFIG')
    private readonly config: ClerkConfig,
  ) {
    // Verificar se a autenticação deve ser ativada (chaves necessárias presentes)
    this.authEnabled = !!(this.config.secretKey && this.config.publishableKey && this.config.jwtKey);

    if (!this.authEnabled) {
      this.logger.warn('Clerk authentication is disabled due to missing credentials. The API will operate in development mode without authentication.');
    } else {
      this.logger.log('Clerk authentication is enabled');
    }
  }

  async validateToken(token: string): Promise<ClerkUser> {
    if (!this.authEnabled) {
      // Em modo de desenvolvimento sem autenticação, retornar um usuário fictício
      return this.getDevelopmentUser();
    }

    try {
      const session = await clerkClient.sessions.verifySession(token, this.config.jwtKey);
      if (!session) {
        throw new UnauthorizedException('Sessão inválida');
      }
      const user = await clerkClient.users.getUser(session.userId);
      if (!user) {
        throw new UnauthorizedException('Usuário não encontrado');
      }
      return this.mapClerkUser(user);
    } catch (error: unknown) {
      const err = error as Error;
      this.logger.error('Erro ao validar token', err.message);
      throw new UnauthorizedException('Token inválido ou expirado');
    }
  }

  async getUser(userId: string): Promise<ClerkUser> {
    if (!this.authEnabled) {
      return this.getDevelopmentUser();
    }

    try {
      const user = await clerkClient.users.getUser(userId);
      return this.mapClerkUser(user);
    } catch (error: unknown) {
      const err = error as Error;
      this.logger.error(`Erro ao buscar usuário ${userId}`, err.message);
      throw new UnauthorizedException('Usuário não encontrado');
    }
  }

  async updateUserMetadata(userId: string, metadata: Record<string, any>): Promise<void> {
    if (!this.authEnabled) {
      this.logger.debug('Tentativa de atualizar metadados em modo de desenvolvimento ignorada');
      return;
    }

    try {
      await clerkClient.users.updateUser(userId, {
        publicMetadata: metadata,
      });
    } catch (error: unknown) {
      const err = error as Error;
      this.logger.error(`Erro ao atualizar metadados do usuário ${userId}`, err.message);
      throw new Error('Erro ao atualizar metadados do usuário');
    }
  }

  async revokeSession(sessionId: string): Promise<void> {
    if (!this.authEnabled) {
      this.logger.debug('Tentativa de revogar sessão em modo de desenvolvimento ignorada');
      return;
    }

    try {
      await clerkClient.sessions.revokeSession(sessionId);
      this.logger.debug(`Sessão ${sessionId} revogada com sucesso`);
    } catch (error: unknown) {
      const err = error as Error;
      this.logger.error(`Erro ao revogar sessão ${sessionId}`, err.message);
      throw new Error('Erro ao revogar sessão');
    }
  }

  async verifySession(sessionId: string): Promise<ClerkSession> {
    if (!this.authEnabled) {
      return {
        id: 'dev-session-id',
        userId: 'dev-user-id',
        status: 'active',
        lastActiveAt: new Date(),
        expireAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // +24h
        abandonAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // +14 dias
      };
    }

    try {
      const session = await clerkClient.sessions.getSession(sessionId);
      return {
        id: session.id,
        userId: session.userId,
        status: session.status,
        lastActiveAt: new Date(session.lastActiveAt),
        expireAt: new Date(session.expireAt),
        abandonAt: new Date(session.abandonAt),
      };
    } catch (error: unknown) {
      const err = error as Error;
      this.logger.error(`Erro ao verificar sessão ${sessionId}`, err.message);
      throw new UnauthorizedException('Sessão inválida');
    }
  }

  private mapClerkUser(user: any): ClerkUser {
    return {
      id: user.id,
      email: user.emailAddresses[0]?.emailAddress,
      firstName: user.firstName,
      lastName: user.lastName,
      imageUrl: user.imageUrl,
      metadata: user.publicMetadata,
      roles: (user.publicMetadata?.roles as string[]) || ['user'],
      createdAt: new Date(user.createdAt),
      updatedAt: new Date(user.updatedAt),
    };
  }

  private getDevelopmentUser(): ClerkUser {
    return {
      id: 'dev-user-id',
      email: 'dev@example.com',
      firstName: 'Development',
      lastName: 'User',
      imageUrl: 'https://via.placeholder.com/150',
      metadata: {},
      roles: ['admin', 'user'], // Conceder acesso total em modo de desenvolvimento
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }
}
