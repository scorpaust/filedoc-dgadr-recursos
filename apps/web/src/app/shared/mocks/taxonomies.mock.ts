// Dados de demonstração — taxonomias geradas a partir dos fluxos, tipos de documento e
// etiquetas já usados nos recursos mock (Fase 3), para servir de ponto de partida à gestão
// de taxonomias da Fase 8 (UI).
import { DOCUMENT_TYPES, Taxonomy, TaxonomyKind, WORKFLOWS } from '../models';
import { resources } from './resources.mock';

function uniqueTags(): readonly string[] {
  const seen = new Set<string>();
  resources.forEach((resource) => resource.tags.forEach((tag) => seen.add(tag)));
  return [...seen].sort((a, b) => a.localeCompare(b, 'pt'));
}

let nextTaxonomyId = 1;

function build(kind: TaxonomyKind, labels: readonly string[]): Taxonomy[] {
  return labels.map((label, index) => ({
    id: `tax-${nextTaxonomyId++}`,
    kind,
    label,
    order: index + 1,
    active: true,
  }));
}

export const taxonomies: readonly Taxonomy[] = [
  ...build('workflow', WORKFLOWS),
  ...build('documentType', DOCUMENT_TYPES),
  ...build('tag', uniqueTags()),
];
