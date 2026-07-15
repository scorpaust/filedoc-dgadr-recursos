import { mockCredentials } from '../../src/app/core/auth/mock-credentials';
import { users } from '../../src/app/shared/mocks/users.mock';

// Ponte para os utilizadores/credenciais mock reais da aplicação (Fase 2/9), para que os
// testes E2E nunca dupliquem nem possam divergir dos dados usados pela UI.
export interface E2eUser {
  readonly id: string;
  readonly name: string;
  readonly email: string;
  // Ausente para utilizadores inativos (sem entrada em `mock-credentials.ts`, tal como a
  // ferramenta de simulação de função do próprio ecrã de login) — nunca usados para `login`.
  readonly password?: string;
  readonly roles: readonly string[];
}

function findUser(email: string): E2eUser {
  const user = users.find((candidate) => candidate.email === email);
  if (!user) {
    throw new Error(`Utilizador mock não encontrado para e-mail: ${email}`);
  }
  const credential = mockCredentials.find((candidate) => candidate.email === email);
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    password: credential?.password,
    roles: user.roles,
  };
}

// Um utilizador de referência por função de base, mais os dois casos especiais usados em
// vários fluxos (utilizador com duas funções, e um segundo agente de suporte).
export const testUsers = {
  employee: findUser('marta.silva@dgadr.gov.pt'), // user-1, só EMPLOYEE
  supportAgent: findUser('carlos.vieira@dgadr.gov.pt'), // user-2, só SUPPORT_AGENT
  contentEditorAndAdmin: findUser('joao.antunes@dgadr.gov.pt'), // user-3, CONTENT_EDITOR + ADMIN
  admin: findUser('ana.ferreira@dgadr.gov.pt'), // user-5, só ADMIN
  secondSupportAgent: findUser('sofia.ramos@dgadr.gov.pt'), // user-6, só SUPPORT_AGENT
  otherEmployee: findUser('paulo.matos@dgadr.gov.pt'), // user-4, EMPLOYEE (inativo)
} as const;

// Combinações rota → funções relevantes exigidas pela tarefa A de
// `fase-11-ui-acessibilidade-e2e.md`. Cada rota é auditada com todos os utilizadores aqui
// listados (o `ADMIN` "puro" e o `CONTENT_EDITOR`+`ADMIN` cobrem, entre os dois, as 4 funções
// de base da aplicação).
export const roleAudienceForRoute: Record<string, readonly E2eUser[]> = {
  '/inicio': [
    testUsers.employee,
    testUsers.supportAgent,
    testUsers.contentEditorAndAdmin,
    testUsers.admin,
  ],
  '/recursos': [testUsers.employee, testUsers.contentEditorAndAdmin],
  '/dicas-faq': [testUsers.employee, testUsers.contentEditorAndAdmin],
  '/suporte': [testUsers.employee],
  '/suporte/novo': [testUsers.employee],
  '/suporte/gestao': [testUsers.supportAgent, testUsers.admin],
  '/conteudos': [testUsers.contentEditorAndAdmin, testUsers.admin],
  '/administracao': [testUsers.admin],
};
