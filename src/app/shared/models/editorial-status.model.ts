export type EditorialStatus = 'draft' | 'published' | 'archived';

export const EDITORIAL_STATUS_LABELS: Record<EditorialStatus, string> = {
  draft: 'Rascunho',
  published: 'Publicado',
  archived: 'Arquivado',
};
