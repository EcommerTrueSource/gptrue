export interface ClerkUser {
  id: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  imageUrl?: string;
  metadata?: Record<string, any>;
  roles: string[];
}

export interface ClerkSession {
  id: string;
  userId: string;
  status: string;
  lastActiveAt: Date;
  expireAt: Date;
  abandonAt: Date;
}
