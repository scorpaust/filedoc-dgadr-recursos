// Dados de demonstração — não representam utilizadores reais da DGADR.
import { AppUser } from '../models';

export const users: readonly AppUser[] = [
  {
    id: 'user-1',
    name: 'Marta Silva',
    email: 'marta.silva@dgadr.gov.pt',
    career: 'Técnico Superior',
    roles: ['EMPLOYEE'],
    status: 'active',
    lastAccess: '2026-07-08',
  },
  {
    id: 'user-2',
    name: 'Carlos Vieira',
    email: 'carlos.vieira@dgadr.gov.pt',
    career: 'Assistente Técnico',
    roles: ['SUPPORT_AGENT'],
    status: 'active',
    lastAccess: '2026-07-08',
  },
  {
    id: 'user-3',
    name: 'João Antunes',
    email: 'joao.antunes@dgadr.gov.pt',
    career: 'Chefe de Divisão',
    // Utilizador com duas funções em simultâneo, para validar visualmente os acessos
    // cumulativos (project-spec.md; fase-2-ui-autenticacao.md, tarefa B) — acede tanto a
    // `/conteudos` como a `/administracao`, e conta como um dos dois administradores
    // ativos exigidos pela Fase 9 (proteção do último `ADMIN`).
    roles: ['CONTENT_EDITOR', 'ADMIN'],
    status: 'active',
    lastAccess: '2026-07-05',
  },
  {
    id: 'user-4',
    name: 'Paulo Matos',
    email: 'paulo.matos@dgadr.gov.pt',
    career: 'Assistente Operacional',
    roles: ['EMPLOYEE'],
    status: 'inactive',
    lastAccess: '2026-05-14',
  },
  {
    id: 'user-5',
    name: 'Ana Ferreira',
    email: 'ana.ferreira@dgadr.gov.pt',
    career: 'Diretora de Serviços',
    roles: ['ADMIN'],
    status: 'active',
    lastAccess: '2026-07-09',
  },
  {
    id: 'user-6',
    name: 'Sofia Ramos',
    email: 'sofia.ramos@dgadr.gov.pt',
    career: 'Assistente Técnico',
    roles: ['SUPPORT_AGENT'],
    status: 'active',
    lastAccess: '2026-07-10',
  },
];
