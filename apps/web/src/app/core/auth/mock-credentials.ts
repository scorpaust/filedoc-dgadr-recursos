// Dados de demonstração — credenciais simuladas, não representam contas reais da DGADR.
// Cada entrada corresponde a um utilizador ativo em `shared/mocks/users.mock.ts`.
export interface MockCredential {
  readonly email: string;
  readonly password: string;
}

export const mockCredentials: readonly MockCredential[] = [
  { email: 'marta.silva@dgadr.gov.pt', password: 'Demo123!' },
  { email: 'carlos.vieira@dgadr.gov.pt', password: 'Demo123!' },
  { email: 'joao.antunes@dgadr.gov.pt', password: 'Demo123!' },
  { email: 'ana.ferreira@dgadr.gov.pt', password: 'Demo123!' },
  { email: 'sofia.ramos@dgadr.gov.pt', password: 'Demo123!' },
];
