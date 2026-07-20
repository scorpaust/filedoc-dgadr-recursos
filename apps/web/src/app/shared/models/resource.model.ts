import { EditorialStatus } from './editorial-status.model';

export type ResourceType = 'video' | 'guide';
export type Difficulty = 'iniciacao' | 'intermedia' | 'avancada';

export const WORKFLOWS = [
  'Criação e registo',
  'Correspondência',
  'Tramitação',
  'Assinatura',
  'Pesquisa',
  'Gestão documental',
  'Arquivo',
  'Correções',
] as const;

export const DOCUMENT_TYPES = [
  'Informação',
  'Ofício',
  'Despacho',
  'Processo',
  'Correspondência',
  'Anexo',
  'Diversos',
] as const;

// Decisão (Fase 8 — UI): alargado de união literal para `string`, para permitir que
// editores/administradores criem novos fluxos e tipos de documento em `TaxonomyMockService`
// sem quebrar a tipagem de `Resource`. `WORKFLOWS`/`DOCUMENT_TYPES` continuam a servir de
// semente inicial da taxonomia (ver `shared/mocks/taxonomies.mock.ts`).
export type Workflow = string;
export type DocumentType = string;

export interface Resource {
  readonly id: string;
  readonly slug: string;
  readonly title: string;
  readonly summary: string;
  readonly description: string;
  readonly type: ResourceType;
  readonly workflow: Workflow;
  readonly documentType: DocumentType;
  readonly difficulty: Difficulty;
  readonly tags: readonly string[];
  readonly duration?: string;
  readonly pages?: number;
  readonly publishedAt: string;
  readonly updatedAt: string;
  readonly status: EditorialStatus;
  readonly author: string;
  readonly relatedResourceIds: readonly string[];
  /** Só definido para `type: 'video'`. */
  readonly videoUrl?: string;
  /** Legendas (WebVTT), só quando disponíveis para o recurso. */
  readonly captionsUrl?: string;
  /** Só definido para `type: 'guide'`. */
  readonly pdfUrl?: string;
  /** Miniatura do recurso (Fase 8 — UI, gestão de conteúdos). */
  readonly thumbnailUrl?: string;
  /** Texto alternativo da miniatura, obrigatório para publicar (project-spec.md, secção N). */
  readonly thumbnailAlt?: string;
}
