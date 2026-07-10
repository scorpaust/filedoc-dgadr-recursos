export type UserRole = 'EMPLOYEE' | 'CONTENT_EDITOR' | 'SUPPORT_AGENT' | 'ADMIN';
export type UserStatus = 'active' | 'inactive';

export interface AppUser {
  readonly id: string;
  readonly name: string;
  readonly email: string;
  readonly career: string;
  readonly role: UserRole;
  readonly status: UserStatus;
  readonly lastAccess: string;
}
