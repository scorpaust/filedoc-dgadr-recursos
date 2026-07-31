import {
  IsArray,
  IsInt,
  IsNotEmpty,
  IsIn,
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

// Todos os campos são opcionais e independentes — um pedido só altera os campos enviados
// (mesmo padrão de `tickets/dto/update-ticket.dto.ts`). "Validação mínima" para um
// rascunho (project-spec.md, secção N): mesmo que enviados, os campos aqui nunca são
// obrigatórios uns em relação aos outros — só `ResourcesService.publish` exige o conjunto
// completo, com `fieldErrors` por campo.
export class UpdateResourceDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  title?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  slug?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  summary?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  description?: string;

  @IsOptional()
  @IsIn(RESOURCE_TYPE_FILTER_VALUES)
  resourceType?: ResourceTypeFilter;

  @IsOptional()
  @IsIn(DIFFICULTY_FILTER_VALUES)
  difficulty?: DifficultyFilter;

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
