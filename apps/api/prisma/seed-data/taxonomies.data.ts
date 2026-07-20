import { slugify } from './slugify';

export interface WorkflowSeedData {
  readonly name: string;
  readonly slug: string;
  readonly sortOrder: number;
}

export interface DocumentTypeSeedData {
  readonly name: string;
  readonly slug: string;
  readonly sortOrder: number;
}

export interface TagSeedData {
  readonly name: string;
  readonly slug: string;
}

// Os oito fluxos iniciais de `project-spec.md` (secção B), pela mesma ordem.
const WORKFLOW_NAMES = [
  'Criação e registo',
  'Correspondência',
  'Tramitação',
  'Assinatura',
  'Pesquisa',
  'Gestão documental',
  'Arquivo',
  'Correções',
] as const;

// Os sete tipos de documento iniciais de `project-spec.md` (secção B), pela mesma ordem.
const DOCUMENT_TYPE_NAMES = [
  'Informação',
  'Ofício',
  'Despacho',
  'Processo',
  'Correspondência',
  'Anexo',
  'Diversos',
] as const;

// Conjunto inicial de etiquetas genéricas (10–15, conforme a tarefa A da especificação),
// escolhido entre as etiquetas já validadas em `resources.mock.ts` (via de UI, Fase 3) —
// não é o conjunto completo de etiquetas do mock (esse tem mais de 40 valores distintos,
// muitos deles demasiado específicos para uma taxonomia inicial "genérica"). Cada recurso
// seed só fica associado às etiquetas desta lista que já constavam do seu mock original
// (ver `docs/decisoes-seeds.md`).
const TAG_NAMES = [
  'registo',
  'correspondência',
  'assinatura',
  'tramitação',
  'pesquisa',
  'arquivo',
  'correção',
  'anexos',
  'permissões',
  'classificação',
  'organização',
  'modelo',
] as const;

export const workflowSeedData: readonly WorkflowSeedData[] = WORKFLOW_NAMES.map(
  (name, index) => ({ name, slug: slugify(name), sortOrder: index + 1 }),
);

export const documentTypeSeedData: readonly DocumentTypeSeedData[] =
  DOCUMENT_TYPE_NAMES.map((name, index) => ({
    name,
    slug: slugify(name),
    sortOrder: index + 1,
  }));

export const tagSeedData: readonly TagSeedData[] = TAG_NAMES.map((name) => ({
  name,
  slug: slugify(name),
}));
