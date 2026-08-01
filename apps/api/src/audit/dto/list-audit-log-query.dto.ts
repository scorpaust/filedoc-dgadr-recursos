import { Transform } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsISO8601,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

// Tipos de entidade produzidos pelos usos atuais de `@Audit(...)` (login/logout, tickets de
// suporte, recursos, gestão de utilizadores) — alinhado com `AuditEntityType` do frontend
// (`shared/models/audit-log.model.ts`), que traduz estas chaves técnicas para rótulos em
// português (`utilizador`/`pedido de suporte`/`recurso`).
export const AUDIT_ENTITY_TYPE_VALUES = ['user', 'ticket', 'resource'] as const;
export type AuditEntityTypeFilter = (typeof AUDIT_ENTITY_TYPE_VALUES)[number];

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

export class ListAuditLogQueryDto {
  @IsOptional()
  @IsIn(AUDIT_ENTITY_TYPE_VALUES)
  entityType?: AuditEntityTypeFilter;

  @IsOptional()
  @IsString()
  actorId?: string;

  @IsOptional()
  @IsISO8601()
  from?: string;

  @IsOptional()
  @IsISO8601()
  to?: string;

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
}
