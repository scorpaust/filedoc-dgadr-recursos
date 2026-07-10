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

export const USER_ROLE_LABELS: Record<UserRole, string> = {
  EMPLOYEE: 'Trabalhador',
  CONTENT_EDITOR: 'Editor de conteúdos',
  SUPPORT_AGENT: 'Agente de suporte',
  ADMIN: 'Administrador',
};
