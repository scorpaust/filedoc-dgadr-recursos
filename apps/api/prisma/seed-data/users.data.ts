import { Role, UserStatus } from '@prisma/client';

export interface UserSeedData {
  readonly key: string;
  readonly name: string;
  readonly email: string;
  readonly roles: readonly Role[];
  readonly status: UserStatus;
  readonly password: string;
}

// Dados de demonstração — nomes e e-mails claramente fictícios, nunca reais da DGADR.
// Reutiliza as identidades já validadas em `shared/mocks/users.mock.ts` (via de UI; o campo
// `career` desse mock não é reutilizado aqui — o modelo `User` desta via, já fechado na
// Fase 1, BD, não tem um campo equivalente). Estas 6 identidades já cobrem, sem necessidade
// de utilizadores adicionais, todos os requisitos da tarefa B — um utilizador por função, um
// utilizador com duas funções em simultâneo (`joao`), dois administradores ativos (`joao`,
// `ana`) e um utilizador inativo (`paulo`).
export const DEV_PASSWORD = 'Demo123!';

export const userSeedData: readonly UserSeedData[] = [
  {
    key: 'marta',
    name: 'Marta Silva',
    email: 'marta.silva@dgadr.gov.pt',
    roles: [Role.EMPLOYEE],
    status: UserStatus.ACTIVE,
    password: DEV_PASSWORD,
  },
  {
    key: 'carlos',
    name: 'Carlos Vieira',
    email: 'carlos.vieira@dgadr.gov.pt',
    roles: [Role.SUPPORT_AGENT],
    status: UserStatus.ACTIVE,
    password: DEV_PASSWORD,
  },
  {
    key: 'joao',
    name: 'João Antunes',
    email: 'joao.antunes@dgadr.gov.pt',
    roles: [Role.CONTENT_EDITOR, Role.ADMIN],
    status: UserStatus.ACTIVE,
    password: DEV_PASSWORD,
  },
  {
    key: 'paulo',
    name: 'Paulo Matos',
    email: 'paulo.matos@dgadr.gov.pt',
    roles: [Role.EMPLOYEE],
    status: UserStatus.INACTIVE,
    password: DEV_PASSWORD,
  },
  {
    key: 'ana',
    name: 'Ana Ferreira',
    email: 'ana.ferreira@dgadr.gov.pt',
    roles: [Role.ADMIN],
    status: UserStatus.ACTIVE,
    password: DEV_PASSWORD,
  },
  {
    key: 'sofia',
    name: 'Sofia Ramos',
    email: 'sofia.ramos@dgadr.gov.pt',
    roles: [Role.SUPPORT_AGENT],
    status: UserStatus.ACTIVE,
    password: DEV_PASSWORD,
  },
];
