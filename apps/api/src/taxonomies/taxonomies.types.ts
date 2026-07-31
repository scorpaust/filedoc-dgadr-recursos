export const TAXONOMY_TYPES = ['workflow', 'documentType', 'tag'] as const;
export type TaxonomyType = (typeof TAXONOMY_TYPES)[number];

export const REORDER_DIRECTIONS = ['up', 'down'] as const;
export type ReorderDirection = (typeof REORDER_DIRECTIONS)[number];

/** Alinhado com `Taxonomy` do frontend (`shared/models/taxonomy.model.ts`). */
export interface TaxonomyResponse {
  readonly id: string;
  readonly label: string;
  readonly order: number;
  readonly active: boolean;
}
