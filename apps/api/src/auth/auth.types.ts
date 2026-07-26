import { Request } from 'express';
import { Role } from '@prisma/client';

export interface CurrentUserPayload {
  readonly id: string;
  readonly name: string;
  readonly email: string;
  readonly roles: readonly Role[];
}

export interface AuthenticatedRequest extends Request {
  user?: CurrentUserPayload;
}
