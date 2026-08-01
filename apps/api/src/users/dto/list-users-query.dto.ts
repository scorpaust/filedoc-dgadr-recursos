import { Role } from '@prisma/client';
import { Transform } from 'class-transformer';
import { IsEnum, IsIn, IsOptional, IsString } from 'class-validator';

export const USER_STATUS_FILTER_VALUES = ['all', 'active', 'inactive'] as const;
export type UserStatusFilter = (typeof USER_STATUS_FILTER_VALUES)[number];

/** Normaliza `?roles=A&roles=B` (array) e `?roles=A` (valor único) para array. */
function toStringArray({ value }: { value: unknown }): string[] | undefined {
  if (value === undefined) {
    return undefined;
  }
  return Array.isArray(value) ? (value as string[]) : [value as string];
}

export class ListUsersQueryDto {
  @IsOptional()
  @IsString()
  q?: string;

  @IsOptional()
  @IsIn(USER_STATUS_FILTER_VALUES)
  status: UserStatusFilter = 'all';

  // Interseção, não igualdade: um utilizador corresponde quando tem pelo menos uma das
  // funções pedidas (project-spec.md, secção O — "um utilizador pode corresponder a mais do
  // que um filtro, caso tenha mais do que uma função").
  @IsOptional()
  @Transform(toStringArray)
  @IsEnum(Role, { each: true })
  roles?: Role[];
}
