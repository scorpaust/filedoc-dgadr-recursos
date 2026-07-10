// Dados de demonstração — não representam dicas publicadas oficialmente pela DGADR.
import { Tip } from '../models';

export const tips: readonly Tip[] = [
  {
    id: 'tip-1',
    text: 'Confirme os metadados antes de submeter um documento.',
    status: 'published',
  },
  { id: 'tip-2', text: 'Pesquise antes de criar um novo registo.', status: 'published' },
  { id: 'tip-3', text: 'Utilize títulos claros e descritivos.', status: 'published' },
  { id: 'tip-4', text: 'Acompanhe as tarefas pendentes com regularidade.', status: 'published' },
];
