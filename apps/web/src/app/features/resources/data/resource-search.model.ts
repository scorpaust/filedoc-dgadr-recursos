import { Difficulty, Resource, ResourceType } from '../../../shared/models';

export type ResourceTypeFilter = ResourceType | 'all';
// 'updated' não é uma opção do dropdown do Catálogo (Fase 3 — UI, só 'recent'/
// 'alphabetical') — usada apenas pela secção "Recursos recentes" da Página Inicial
// (Fase 9 — Integração), distinta de 'recent' (`publishedAt`, usado também por
// "Recursos em destaque").
export type ResourceSortOption = 'recent' | 'alphabetical' | 'updated';

export interface ResourceSearchParams {
  readonly query: string;
  readonly type: ResourceTypeFilter;
  readonly workflows: readonly string[];
  readonly difficulties: readonly Difficulty[];
  readonly sort: ResourceSortOption;
  readonly page: number;
  readonly pageSize: number;
}

export interface ResourceSearchResult {
  readonly items: readonly Resource[];
  readonly total: number;
}
