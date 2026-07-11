import { Difficulty, Resource, ResourceType } from '../../../shared/models';

export type ResourceTypeFilter = ResourceType | 'all';
export type ResourceSortOption = 'recent' | 'alphabetical';

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
