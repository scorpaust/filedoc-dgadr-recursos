import {
  Controller,
  Get,
  HttpStatus,
  Param,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { AuthGuard } from '../auth/guards/auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { CurrentUserPayload } from '../auth/auth.types';
import { ListResourcesQueryDto } from './dto/list-resources-query.dto';
import { ResourcesService } from './resources.service';
import {
  ResourceDetailResponse,
  ResourceSearchResponse,
} from './resources.types';

// Todas as rotas exigem sessão (`AuthGuard`) — a aplicação inteira já está atrás de
// autenticação no frontend (`authGuard` em `app.routes.ts`); a visibilidade por estado
// editorial (DRAFT/ARCHIVED) é decidida em `ResourcesService`, nunca aqui.
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
