export type TaxonomyKind = 'workflow' | 'documentType' | 'tag';

export const TAXONOMY_KIND_LABELS: Record<TaxonomyKind, string> = {
  workflow: 'Fluxo',
  documentType: 'Tipo de documento',
  tag: 'Etiqueta',
};

export interface Taxonomy {
  readonly id: string;
  readonly kind: TaxonomyKind;
  readonly label: string;
  readonly order: number;
  readonly active: boolean;
}
