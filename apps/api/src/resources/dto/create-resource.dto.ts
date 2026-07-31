import {
  IsArray,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import {
  DIFFICULTY_FILTER_VALUES,
  RESOURCE_TYPE_FILTER_VALUES,
  type DifficultyFilter,
  type ResourceTypeFilter,
} from './list-resources-query.dto';

// `title`/`slug`/`summary`/`description`/`resourceType`/`difficulty` são colunas
// obrigatórias no esquema (`prisma/schema.prisma`) — não podem ficar por preencher nem
// para um rascunho existir. Os restantes campos (fluxo, tipo de documento, etiquetas,
// duração/páginas, texto alternativo da miniatura) só passam a ser obrigatórios ao
// publicar (`ResourcesService.publish`, com `fieldErrors` por campo) — nunca aqui.
export class CreateResourceDto {
  @IsString()
  @IsNotEmpty()
  title!: string;

  @IsString()
  @IsNotEmpty()
  slug!: string;

  @IsString()
  @IsNotEmpty()
  summary!: string;

  @IsString()
  @IsNotEmpty()
  description!: string;

  @IsIn(RESOURCE_TYPE_FILTER_VALUES)
  resourceType!: ResourceTypeFilter;

  @IsIn(DIFFICULTY_FILTER_VALUES)
  difficulty!: DifficultyFilter;

  @IsOptional()
  @IsString()
  workflow?: string;

  @IsOptional()
  @IsString()
  documentType?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  /** Formato `"m:ss"` (só a componente de minutos é usada — o mapeamento de leitura já
   * ignora segundos, `resources.service.ts#toResponse`). */
  @IsOptional()
  @IsString()
  duration?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  pages?: number;

  @IsOptional()
  @IsString()
  thumbnailAlt?: string;
}
