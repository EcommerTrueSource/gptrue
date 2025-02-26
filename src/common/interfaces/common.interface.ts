import { Request } from 'express';

export interface IUser {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  imageUrl?: string;
  roles?: string[];
  metadata?: Record<string, unknown>;
}

export interface IAuthenticatedRequest extends Request {
  user: IUser;
}

export interface IClerkUser {
  id: string;
  emailAddress: string;
  firstName?: string;
  lastName?: string;
  imageUrl?: string;
  publicMetadata?: Record<string, unknown>;
  primaryEmailAddressId: string;
  emailAddresses: Array<{
    id: string;
    emailAddress: string;
  }>;
}

export interface IJobResult<T = unknown> {
  id: string;
  state: string;
  progress: number;
  returnvalue: T;
  failedReason?: string;
}

export interface IQueryResult {
  query: string;
  fields: Array<{
    name: string;
    type: string;
    mode: string;
    description?: string;
  }>;
  statistics: {
    totalBytesProcessed: number;
  };
}

export interface IErrorResponse {
  message: string;
  stack?: string;
  status?: number;
  response?: {
    message: string;
    status: number;
  };
}
