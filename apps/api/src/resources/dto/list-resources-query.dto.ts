import { Transform } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export const RESOURCE_TYPE_FILTER_VALUES = ['video', 'guide'] as const;
export const DIFFICULTY_FILTER_VALUES = [
  'iniciacao',
  'intermedia',
  'avancada',
] as const;
export const SORT_VALUES = ['recent', 'alphabetical'] as const;

export type ResourceTypeFilter = (typeof RESOURCE_TYPE_FILTER_VALUES)[number];
export type DifficultyFilter = (typeof DIFFICULTY_FILTER_VALUES)[number];
export type SortOption = (typeof SORT_VALUES)[number];

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 12;
const MAX_PAGE_SIZE = 100;

/** Normaliza `?workflow=a&workflow=b` (array) e `?workflow=a` (valor único) para array. */
function toStringArray({ value }: { value: unknown }): string[] | undefined {
  if (value === undefined) {
    return undefined;
  }
  return Array.isArray(value) ? (value as string[]) : [value as string];
}

export class ListResourcesQueryDto {
  @IsOptional()
  @IsString()
  q?: string;

  @IsOptional()
  @IsIn(RESOURCE_TYPE_FILTER_VALUES)
  type?: ResourceTypeFilter;

  @IsOptional()
  @Transform(toStringArray)
  @IsString({ each: true })
  workflow?: string[];

  @IsOptional()
  @Transform(toStringArray)
  @IsString({ each: true })
  documentType?: string[];

  @IsOptional()
  @Transform(toStringArray)
  @IsIn(DIFFICULTY_FILTER_VALUES, { each: true })
  difficulty?: DifficultyFilter[];

  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  page: number = DEFAULT_PAGE;

  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  @Max(MAX_PAGE_SIZE)
  pageSize: number = DEFAULT_PAGE_SIZE;

  @IsOptional()
  @IsIn(SORT_VALUES)
  sort: SortOption = 'recent';
}
