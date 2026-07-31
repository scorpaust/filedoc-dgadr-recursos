import {
  Body,
  Controller,
  Get,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import type { Response } from 'express';
import { AuthGuard } from '../auth/guards/auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import type { CurrentUserPayload } from '../auth/auth.types';
import { CreateResourceDto } from './dto/create-resource.dto';
import { ListManagementResourcesQueryDto } from './dto/list-management-resources-query.dto';
import { ListResourcesQueryDto } from './dto/list-resources-query.dto';
import { ResourceUploadUrlDto } from './dto/resource-upload-url.dto';
import { UpdateResourceDto } from './dto/update-resource.dto';
import { ResourcesService } from './resources.service';
import {
  ResourceDetailResponse,
  ResourceResponse,
  ResourceSearchResponse,
} from './resources.types';
import type { CreateUploadUrlResult } from '../storage/storage.types';

const EDITOR_ROLES = [Role.CONTENT_EDITOR, Role.ADMIN] as const;

// Todas as rotas exigem sessão (`AuthGuard`) — a aplicação inteira já está atrás de
// autenticação no frontend (`authGuard` em `app.routes.ts`); a visibilidade por estado
// editorial (DRAFT/ARCHIVED) é decidida em `ResourcesService`, nunca aqui. As rotas de
// gestão editorial (fase-7-integracao-gestao-conteudos.md) acrescentam `RolesGuard` ao
// nível do método, mantendo a classe só com `AuthGuard` para não afetar a leitura pública.
@Controller('resources')
@UseGuards(AuthGuard)
export class ResourcesController {
  constructor(private readonly resourcesService: ResourcesService) {}

  @Get()
  search(
    @Query() query: ListResourcesQueryDto,
    @CurrentUser() user: CurrentUserPayload,
  ): Promise<ResourceSearchResponse> {
    return this.resourcesService.search(query, user.roles);
  }

  // Registados antes de `GET /:slug` (segmento único, tal como `management`) — a ordem
  // de registo decide qual rota casa primeiro.
  @Get('management')
  @UseGuards(RolesGuard)
  @Roles(...EDITOR_ROLES)
  listForManagement(
    @Query() query: ListManagementResourcesQueryDto,
  ): Promise<readonly ResourceResponse[]> {
    return this.resourcesService.listForManagement(query);
  }

  @Get('management/:id')
  @UseGuards(RolesGuard)
  @Roles(...EDITOR_ROLES)
  getByIdForManagement(@Param('id') id: string): Promise<ResourceResponse> {
    return this.resourcesService.getByIdForManagement(id);
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles(...EDITOR_ROLES)
  create(
    @Body() dto: CreateResourceDto,
    @CurrentUser() user: CurrentUserPayload,
  ): Promise<ResourceResponse> {
    return this.resourcesService.create(dto, user);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles(...EDITOR_ROLES)
  update(
    @Param('id') id: string,
    @Body() dto: UpdateResourceDto,
    @CurrentUser() user: CurrentUserPayload,
  ): Promise<ResourceResponse> {
    return this.resourcesService.update(id, dto, user);
  }

  @Post(':id/duplicate')
  @UseGuards(RolesGuard)
  @Roles(...EDITOR_ROLES)
  duplicate(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserPayload,
  ): Promise<ResourceResponse> {
    return this.resourcesService.duplicate(id, user);
  }

  @Post(':id/publish')
  @UseGuards(RolesGuard)
  @Roles(...EDITOR_ROLES)
  publish(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserPayload,
  ): Promise<ResourceResponse> {
    return this.resourcesService.publish(id, user);
  }

  @Post(':id/unpublish')
  @UseGuards(RolesGuard)
  @Roles(...EDITOR_ROLES)
  unpublish(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserPayload,
  ): Promise<ResourceResponse> {
    return this.resourcesService.unpublish(id, user);
  }

  @Post(':id/archive')
  @UseGuards(RolesGuard)
  @Roles(...EDITOR_ROLES)
  archive(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserPayload,
  ): Promise<ResourceResponse> {
    return this.resourcesService.archive(id, user);
  }

  @Post(':id/restore')
  @UseGuards(RolesGuard)
  @Roles(...EDITOR_ROLES)
  restore(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserPayload,
  ): Promise<ResourceResponse> {
    return this.resourcesService.restore(id, user);
  }

  @Post(':id/upload-url')
  @UseGuards(RolesGuard)
  @Roles(...EDITOR_ROLES)
  uploadUrl(
    @Param('id') id: string,
    @Body() dto: ResourceUploadUrlDto,
    @CurrentUser() user: CurrentUserPayload,
  ): Promise<CreateUploadUrlResult | ResourceResponse> {
    return dto.phase === 'init'
      ? this.resourcesService.initUpload(id, dto)
      : this.resourcesService.confirmUpload(id, dto, user);
  }

  @Get(':id/file')
  async getFile(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserPayload,
    @Res() response: Response,
  ): Promise<void> {
    const url = await this.resourcesService.getFileDownloadUrl(id, user.roles);
    response.redirect(HttpStatus.FOUND, url);
  }

  @Get(':id/thumbnail')
  async getThumbnail(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserPayload,
    @Res() response: Response,
  ): Promise<void> {
    const url = await this.resourcesService.getThumbnailDownloadUrl(
      id,
      user.roles,
    );
    response.redirect(HttpStatus.FOUND, url);
  }

  @Get(':slug')
  getBySlug(
    @Param('slug') slug: string,
    @CurrentUser() user: CurrentUserPayload,
  ): Promise<ResourceDetailResponse> {
    return this.resourcesService.getBySlug(slug, user.roles);
  }
}
