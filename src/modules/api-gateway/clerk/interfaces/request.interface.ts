export interface ClerkUser {
  id: string;
  email: string;
  roles: string[];
}

export interface RequestWithUser {
  user: ClerkUser;
}
