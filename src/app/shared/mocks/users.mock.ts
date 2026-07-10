// Dados de demonstração — não representam utilizadores reais da DGADR.
import { AppUser } from '../models';

export const users: readonly AppUser[] = [
  {
    id: 'user-1',
    name: 'Marta Silva',
    email: 'marta.silva@dgadr.gov.pt',
    career: 'Técnico Superior',
    role: 'EMPLOYEE',
    status: 'active',
    lastAccess: '2026-07-08',
  },
  {
    id: 'user-2',
    name: 'Carlos Vieira',
    email: 'carlos.vieira@dgadr.gov.pt',
    career: 'Assistente Técnico',
    role: 'SUPPORT_AGENT',
    status: 'active',
    lastAccess: '2026-07-08',
  },
  {
    id: 'user-3',
    name: 'João Antunes',
    email: 'joao.antunes@dgadr.gov.pt',
    career: 'Chefe de Divisão',
    role: 'CONTENT_EDITOR',
    status: 'active',
    lastAccess: '2026-07-05',
  },
  {
    id: 'user-4',
    name: 'Paulo Matos',
    email: 'paulo.matos@dgadr.gov.pt',
    career: 'Assistente Operacional',
    role: 'EMPLOYEE',
    status: 'inactive',
    lastAccess: '2026-05-14',
  },
];

export const currentUser: AppUser = users[0];
