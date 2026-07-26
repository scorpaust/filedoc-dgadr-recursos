import { Role, UserStatus } from '@prisma/client';

export interface UserSeedData {
  readonly id: string;
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

// `id` fixo (em vez do `cuid()` por omissão do esquema) e igual ao usado por
// `shared/mocks/users.mock.ts` no frontend — os dados de recursos/tickets/dicas aí
// (ainda não integrados com a API real) associam-se a utilizadores por este `id`
// literal (`requesterId: 'user-1'`, etc.); sem isto, o `id` real devolvido pelo login
// nunca corresponderia a essas associações mock. Só se aplica a registos novos —
// `upsert` não migra o `id` de um utilizador já semeado antes desta alteração.
export const userSeedData: readonly UserSeedData[] = [
  {
    id: 'user-1',
    key: 'marta',
    name: 'Marta Silva',
    email: 'marta.silva@dgadr.gov.pt',
    roles: [Role.EMPLOYEE],
    status: UserStatus.ACTIVE,
    password: DEV_PASSWORD,
  },
  {
    id: 'user-2',
    key: 'carlos',
    name: 'Carlos Vieira',
    email: 'carlos.vieira@dgadr.gov.pt',
    roles: [Role.SUPPORT_AGENT],
    status: UserStatus.ACTIVE,
    password: DEV_PASSWORD,
  },
  {
    id: 'user-3',
    key: 'joao',
    name: 'João Antunes',
    email: 'joao.antunes@dgadr.gov.pt',
    roles: [Role.CONTENT_EDITOR, Role.ADMIN],
    status: UserStatus.ACTIVE,
    password: DEV_PASSWORD,
  },
  {
    id: 'user-4',
    key: 'paulo',
    name: 'Paulo Matos',
    email: 'paulo.matos@dgadr.gov.pt',
    roles: [Role.EMPLOYEE],
    status: UserStatus.INACTIVE,
    password: DEV_PASSWORD,
  },
  {
    id: 'user-5',
    key: 'ana',
    name: 'Ana Ferreira',
    email: 'ana.ferreira@dgadr.gov.pt',
    roles: [Role.ADMIN],
    status: UserStatus.ACTIVE,
    password: DEV_PASSWORD,
  },
  {
    id: 'user-6',
    key: 'sofia',
    name: 'Sofia Ramos',
    email: 'sofia.ramos@dgadr.gov.pt',
    roles: [Role.SUPPORT_AGENT],
    status: UserStatus.ACTIVE,
    password: DEV_PASSWORD,
  },
];
