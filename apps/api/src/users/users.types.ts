import { Prisma, Role } from '@prisma/client';

export const USER_INCLUDE = { roles: true } satisfies Prisma.UserInclude;
export type UserWithRoles = Prisma.UserGetPayload<{
  include: typeof USER_INCLUDE;
}>;

/** Alinhado com `AppUser` do frontend (`shared/models/app-user.model.ts`) — nunca inclui
 * `passwordHash` nem qualquer outro campo interno. */
export interface UserResponse {
  readonly id: string;
  readonly name: string;
  readonly email: string;
  readonly roles: readonly Role[];
  readonly status: 'active' | 'inactive';
  readonly lastAccess: string;
}
