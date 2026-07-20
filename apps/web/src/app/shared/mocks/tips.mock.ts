// Dados de demonstração — não representam dicas publicadas oficialmente pela DGADR.
import { Tip } from '../models';

export const tips: readonly Tip[] = [
  {
    id: 'tip-1',
    text: 'Confirme os metadados antes de submeter um documento.',
    status: 'published',
    sortOrder: 1,
  },
  {
    id: 'tip-2',
    text: 'Pesquise antes de criar um novo registo.',
    status: 'published',
    sortOrder: 2,
  },
  {
    id: 'tip-3',
    text: 'Utilize títulos claros e descritivos.',
    status: 'published',
    sortOrder: 3,
  },
  {
    id: 'tip-4',
    text: 'Acompanhe as tarefas pendentes com regularidade.',
    status: 'published',
    sortOrder: 4,
  },
  {
    id: 'tip-5',
    text: 'Verifique o fluxo associado ao documento antes de o submeter.',
    status: 'published',
    sortOrder: 5,
  },
  {
    id: 'tip-6',
    text: 'Esta dica está em revisão e ainda não deve ser publicada.',
    status: 'draft',
    sortOrder: 6,
  },
];
