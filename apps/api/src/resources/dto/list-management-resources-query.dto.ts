import { IsIn, IsOptional, IsString } from 'class-validator';

export const MANAGEMENT_STATUS_VALUES = [
  'all',
  'draft',
  'published',
  'archived',
] as const;
export type ManagementStatusFilter = (typeof MANAGEMENT_STATUS_VALUES)[number];

/**
 * Query da listagem editorial (`GET /resources/management`) — ao contrário de
 * `ListResourcesQueryDto` (catálogo público), inclui `archived` e não pagina: a tabela de
 * gestão mostra sempre todos os resultados, tal como `ResourceMockService.listAllForManagement`.
 */
export class ListManagementResourcesQueryDto {
  @IsOptional()
  @IsIn(MANAGEMENT_STATUS_VALUES)
  status: ManagementStatusFilter = 'all';

  @IsOptional()
  @IsString()
  q?: string;
}
