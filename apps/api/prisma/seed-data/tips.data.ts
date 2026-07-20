import { ContentStatus } from '@prisma/client';

export interface TipSeedData {
  readonly id: string;
  readonly title: string;
  readonly content: string;
  readonly status: ContentStatus;
  readonly sortOrder: number;
  /** Só definido para dicas `PUBLISHED` (nunca para `DRAFT`). */
  readonly publishedAt?: string;
  /** `key` de `userSeedData` — autor de criação e de última atualização. */
  readonly authorKey: string;
}

// `content` reutilizado tal e qual de `shared/mocks/tips.mock.ts` (via de UI, Fase 5) e de
// `project-spec.md` (secção F, "Conteúdos iniciais de exemplo"). O modelo `Tip` desta via
// (Fase 1, BD) tem um campo `title` que não existe no mock da via de UI (que só guardava
// uma frase única); os títulos abaixo foram por isso escritos de novo nesta fase — ver
// `docs/decisoes-seeds.md`.
export const tipSeedData: readonly TipSeedData[] = [
  {
    id: 'seed-tip-1',
    title: 'Confirmar metadados',
    content: 'Confirme os metadados antes de submeter um documento.',
    status: ContentStatus.PUBLISHED,
    sortOrder: 1,
    publishedAt: '2026-06-01',
    authorKey: 'joao',
  },
  {
    id: 'seed-tip-2',
    title: 'Pesquisar antes de criar',
    content: 'Pesquise antes de criar um novo registo.',
    status: ContentStatus.PUBLISHED,
    sortOrder: 2,
    publishedAt: '2026-06-01',
    authorKey: 'joao',
  },
  {
    id: 'seed-tip-3',
    title: 'Títulos claros',
    content: 'Utilize títulos claros e descritivos.',
    status: ContentStatus.PUBLISHED,
    sortOrder: 3,
    publishedAt: '2026-06-01',
    authorKey: 'ana',
  },
  {
    id: 'seed-tip-4',
    title: 'Acompanhar tarefas pendentes',
    content: 'Acompanhe as tarefas pendentes com regularidade.',
    status: ContentStatus.PUBLISHED,
    sortOrder: 4,
    publishedAt: '2026-06-01',
    authorKey: 'ana',
  },
  {
    id: 'seed-tip-5',
    title: 'Verificar o fluxo associado',
    content: 'Verifique o fluxo associado ao documento antes de o submeter.',
    status: ContentStatus.PUBLISHED,
    sortOrder: 5,
    publishedAt: '2026-06-15',
    authorKey: 'joao',
  },
  {
    id: 'seed-tip-6',
    title: 'Dica em revisão',
    content: 'Esta dica está em revisão e ainda não deve ser publicada.',
    status: ContentStatus.DRAFT,
    sortOrder: 6,
    authorKey: 'ana',
  },
];
