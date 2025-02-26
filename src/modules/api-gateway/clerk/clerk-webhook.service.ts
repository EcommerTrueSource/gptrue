import { Injectable, Logger } from '@nestjs/common';
import { Webhook } from 'svix';
import { ClerkService } from './clerk.service';
import { ClerkWebhookEvent, ClerkWebhookEventType } from './interfaces/clerk-types.interface';

@Injectable()
export class ClerkWebhookService {
  private readonly logger = new Logger(ClerkWebhookService.name);

  constructor(
    private readonly clerkService: ClerkService,
  ) {}

  async handleWebhook(
    body: Record<string, any>,
    svixId: string,
    svixTimestamp: string,
    svixSignature: string,
  ): Promise<void> {
    try {
      const wh = new Webhook(process.env.CLERK_WEBHOOK_SECRET || '');
      const evt = wh.verify(JSON.stringify(body), {
        'svix-id': svixId,
        'svix-timestamp': svixTimestamp,
        'svix-signature': svixSignature,
      }) as ClerkWebhookEvent;

      this.logger.debug(`Processando evento webhook: ${evt.type}`);

      switch (evt.type as ClerkWebhookEventType) {
        case 'user.created':
          await this.handleUserCreated(evt.data);
          break;
        case 'user.updated':
          await this.handleUserUpdated(evt.data);
          break;
        case 'user.deleted':
          await this.handleUserDeleted(evt.data);
          break;
        case 'session.created':
          await this.handleSessionCreated(evt.data);
          break;
        case 'session.removed':
          await this.handleSessionRemoved(evt.data);
          break;
        case 'session.ended':
          await this.handleSessionEnded(evt.data);
          break;
        default:
          this.logger.warn(`Evento não tratado: ${evt.type}`);
      }

      this.logger.debug(`Evento ${evt.type} processado com sucesso`);
    } catch (error) {
      this.logger.error('Erro ao processar webhook do Clerk', error);
      throw error;
    }
  }

  private async handleUserCreated(data: Record<string, any>): Promise<void> {
    try {
      await this.clerkService.getUser(data.id);
      this.logger.log(`Novo usuário sincronizado: ${data.id}`);
    } catch (error) {
      this.logger.error(`Erro ao sincronizar novo usuário: ${data.id}`, error);
      throw error;
    }
  }

  private async handleUserUpdated(data: Record<string, any>): Promise<void> {
    try {
      await this.clerkService.getUser(data.id);
      this.logger.log(`Usuário atualizado sincronizado: ${data.id}`);
    } catch (error) {
      this.logger.error(`Erro ao sincronizar atualização de usuário: ${data.id}`, error);
      throw error;
    }
  }

  private async handleUserDeleted(data: Record<string, any>): Promise<void> {
    try {
      // Implementar lógica de deleção de usuário no sistema
      this.logger.log(`Usuário deletado: ${data.id}`);
    } catch (error) {
      this.logger.error(`Erro ao processar deleção de usuário: ${data.id}`, error);
      throw error;
    }
  }

  private async handleSessionCreated(data: Record<string, any>): Promise<void> {
    try {
      await this.clerkService.verifySession(data.id);
      this.logger.log(`Nova sessão verificada: ${data.id}`);
    } catch (error) {
      this.logger.error(`Erro ao verificar nova sessão: ${data.id}`, error);
      throw error;
    }
  }

  private async handleSessionRemoved(data: Record<string, any>): Promise<void> {
    try {
      await this.clerkService.revokeSession(data.id);
      this.logger.log(`Sessão removida: ${data.id}`);
    } catch (error) {
      this.logger.error(`Erro ao remover sessão: ${data.id}`, error);
      throw error;
    }
  }

  private async handleSessionEnded(data: Record<string, any>): Promise<void> {
    try {
      await this.clerkService.revokeSession(data.id);
      this.logger.log(`Sessão finalizada: ${data.id}`);
    } catch (error) {
      this.logger.error(`Erro ao finalizar sessão: ${data.id}`, error);
      throw error;
    }
  }
}
