export interface ClerkUser {
  id: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  imageUrl?: string;
  metadata?: Record<string, any>;
  roles: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface ClerkSession {
  id: string;
  userId: string;
  status: string;
  lastActiveAt: Date;
  expireAt: Date;
  abandonAt: Date;
}

export interface ClerkWebhookEvent {
  data: Record<string, any>;
  object: string;
  type: ClerkWebhookEventType;
}

export type ClerkWebhookEventType =
  | 'user.created'
  | 'user.updated'
  | 'user.deleted'
  | 'session.created'
  | 'session.removed'
  | 'session.ended';

export interface ClerkAuthState {
  isAuthenticated: boolean;
  user?: ClerkUser;
  session?: ClerkSession;
}

export interface ClerkConfig {
  secretKey: string;
  publishableKey: string;
  webhookSecret: string;
  jwtKey: string;
}
