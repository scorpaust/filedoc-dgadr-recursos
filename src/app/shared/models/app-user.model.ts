export type UserRole = 'EMPLOYEE' | 'CONTENT_EDITOR' | 'SUPPORT_AGENT' | 'ADMIN';
export type UserStatus = 'active' | 'inactive';

export interface AppUser {
  readonly id: string;
  readonly name: string;
  readonly email: string;
  readonly career: string;
  // Um utilizador pode acumular mais do que uma função em simultâneo
  // (project-spec.md, secção "Funções do sistema"); nunca vazio.
  readonly roles: readonly UserRole[];
  readonly status: UserStatus;
  readonly lastAccess: string;
}

export const USER_ROLE_LABELS: Record<UserRole, string> = {
  EMPLOYEE: 'Trabalhador',
  CONTENT_EDITOR: 'Editor de conteúdos',
  SUPPORT_AGENT: 'Agente de suporte',
  ADMIN: 'Administrador',
};

// Autorização por interseção: um utilizador acede quando possui, entre as suas
// funções, pelo menos uma das funções permitidas (project-spec.md, secção "Funções do sistema").
export function hasAnyRole(
  userRoles: readonly UserRole[],
  allowedRoles: readonly UserRole[],
): boolean {
  return userRoles.some((role) => allowedRoles.includes(role));
}

export function formatRoleLabels(roles: readonly UserRole[]): string {
  return roles.map((role) => USER_ROLE_LABELS[role]).join(' + ');
}
