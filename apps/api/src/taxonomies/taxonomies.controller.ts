import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { AuthGuard } from '../auth/guards/auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CreateTaxonomyDto } from './dto/create-taxonomy.dto';
import { ReorderTaxonomyDto } from './dto/reorder-taxonomy.dto';
import { UpdateTaxonomyDto } from './dto/update-taxonomy.dto';
import { TaxonomiesService } from './taxonomies.service';
import {
  TAXONOMY_TYPES,
  TaxonomyResponse,
  TaxonomyType,
} from './taxonomies.types';

// Ao contrário de recursos/dicas/FAQ, a gestão de taxonomias não tem nenhuma leitura
// pública — toda a área é editorial (project-spec.md, secção B), pelo que o `RolesGuard`
// se aplica à classe inteira, não só a cada método.
@Controller('taxonomies')
@UseGuards(AuthGuard, RolesGuard)
@Roles(Role.CONTENT_EDITOR, Role.ADMIN)
export class TaxonomiesController {
  constructor(private readonly taxonomiesService: TaxonomiesService) {}

  @Get(':type')
  list(@Param('type') type: string): Promise<readonly TaxonomyResponse[]> {
    return this.taxonomiesService.list(this.parseType(type));
  }

  @Post(':type')
  create(
    @Param('type') type: string,
    @Body() dto: CreateTaxonomyDto,
  ): Promise<TaxonomyResponse> {
    return this.taxonomiesService.create(this.parseType(type), dto.name);
  }

  @Patch(':type/:id')
  update(
    @Param('type') type: string,
    @Param('id') id: string,
    @Body() dto: UpdateTaxonomyDto,
  ): Promise<TaxonomyResponse> {
    return this.taxonomiesService.update(this.parseType(type), id, dto.name);
  }

  @Patch(':type/:id/toggle-active')
  toggleActive(
    @Param('type') type: string,
    @Param('id') id: string,
  ): Promise<TaxonomyResponse> {
    return this.taxonomiesService.toggleActive(this.parseType(type), id);
  }

  @Post(':type/reorder')
  reorder(
    @Param('type') type: string,
    @Body() dto: ReorderTaxonomyDto,
  ): Promise<readonly TaxonomyResponse[]> {
    return this.taxonomiesService.reorder(
      this.parseType(type),
      dto.id,
      dto.direction,
    );
  }

  @Delete(':type/:id')
  delete(@Param('type') type: string, @Param('id') id: string): Promise<void> {
    return this.taxonomiesService.delete(this.parseType(type), id);
  }

  private parseType(type: string): TaxonomyType {
    if (!TAXONOMY_TYPES.includes(type as TaxonomyType)) {
      throw new BadRequestException('Tipo de taxonomia desconhecido.');
    }
    return type as TaxonomyType;
  }
}
