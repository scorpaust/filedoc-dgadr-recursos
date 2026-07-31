import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { AuthGuard } from '../auth/guards/auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import type { CurrentUserPayload } from '../auth/auth.types';
import { ContentService } from './content.service';
import { CreateFaqDto } from './dto/create-faq.dto';
import { CreateTipDto } from './dto/create-tip.dto';
import { ReorderContentDto } from './dto/reorder-content.dto';
import { UpdateFaqDto } from './dto/update-faq.dto';
import { UpdateTipDto } from './dto/update-tip.dto';
import { FaqResponse, TipResponse } from './content.types';

const EDITOR_ROLES = [Role.CONTENT_EDITOR, Role.ADMIN] as const;

// A visibilidade por estado editorial é decidida no `ContentService`, não por função fixa da
// rota — mesmo padrão já adotado por `ResourcesController` (Fase 3 — Integração). As rotas de
// gestão editorial (Fase 7 — Integração) acrescentam `RolesGuard` ao nível do método.
@Controller()
@UseGuards(AuthGuard)
export class ContentController {
  constructor(private readonly contentService: ContentService) {}

  @Get('tips')
  getTips(
    @CurrentUser() user: CurrentUserPayload,
  ): Promise<readonly TipResponse[]> {
    return this.contentService.listTips(user.roles);
  }

  @Get('faqs')
  getFaqs(
    @CurrentUser() user: CurrentUserPayload,
  ): Promise<readonly FaqResponse[]> {
    return this.contentService.listFaqs(user.roles);
  }

  @Get('tips/management')
  @UseGuards(RolesGuard)
  @Roles(...EDITOR_ROLES)
  listTipsForManagement(): Promise<readonly TipResponse[]> {
    return this.contentService.listAllTips();
  }

  @Get('faqs/management')
  @UseGuards(RolesGuard)
  @Roles(...EDITOR_ROLES)
  listFaqsForManagement(): Promise<readonly FaqResponse[]> {
    return this.contentService.listAllFaqs();
  }

  @Post('tips')
  @UseGuards(RolesGuard)
  @Roles(...EDITOR_ROLES)
  createTip(
    @Body() dto: CreateTipDto,
    @CurrentUser() user: CurrentUserPayload,
  ): Promise<TipResponse> {
    return this.contentService.createTip(dto, user);
  }

  @Patch('tips/:id')
  @UseGuards(RolesGuard)
  @Roles(...EDITOR_ROLES)
  updateTip(
    @Param('id') id: string,
    @Body() dto: UpdateTipDto,
    @CurrentUser() user: CurrentUserPayload,
  ): Promise<TipResponse> {
    return this.contentService.updateTip(id, dto, user);
  }

  @Post('tips/:id/publish')
  @UseGuards(RolesGuard)
  @Roles(...EDITOR_ROLES)
  publishTip(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserPayload,
  ): Promise<TipResponse> {
    return this.contentService.publishTip(id, user);
  }

  @Post('tips/:id/unpublish')
  @UseGuards(RolesGuard)
  @Roles(...EDITOR_ROLES)
  unpublishTip(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserPayload,
  ): Promise<TipResponse> {
    return this.contentService.unpublishTip(id, user);
  }

  @Post('tips/:id/archive')
  @UseGuards(RolesGuard)
  @Roles(...EDITOR_ROLES)
  archiveTip(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserPayload,
  ): Promise<TipResponse> {
    return this.contentService.archiveTip(id, user);
  }

  @Post('tips/:id/restore')
  @UseGuards(RolesGuard)
  @Roles(...EDITOR_ROLES)
  restoreTip(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserPayload,
  ): Promise<TipResponse> {
    return this.contentService.restoreTip(id, user);
  }

  @Post('tips/reorder')
  @UseGuards(RolesGuard)
  @Roles(...EDITOR_ROLES)
  reorderTip(@Body() dto: ReorderContentDto): Promise<readonly TipResponse[]> {
    return this.contentService.reorderTip(dto.id, dto.direction);
  }

  @Post('faqs')
  @UseGuards(RolesGuard)
  @Roles(...EDITOR_ROLES)
  createFaq(
    @Body() dto: CreateFaqDto,
    @CurrentUser() user: CurrentUserPayload,
  ): Promise<FaqResponse> {
    return this.contentService.createFaq(dto, user);
  }

  @Patch('faqs/:id')
  @UseGuards(RolesGuard)
  @Roles(...EDITOR_ROLES)
  updateFaq(
    @Param('id') id: string,
    @Body() dto: UpdateFaqDto,
    @CurrentUser() user: CurrentUserPayload,
  ): Promise<FaqResponse> {
    return this.contentService.updateFaq(id, dto, user);
  }

  @Post('faqs/:id/publish')
  @UseGuards(RolesGuard)
  @Roles(...EDITOR_ROLES)
  publishFaq(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserPayload,
  ): Promise<FaqResponse> {
    return this.contentService.publishFaq(id, user);
  }

  @Post('faqs/:id/unpublish')
  @UseGuards(RolesGuard)
  @Roles(...EDITOR_ROLES)
  unpublishFaq(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserPayload,
  ): Promise<FaqResponse> {
    return this.contentService.unpublishFaq(id, user);
  }

  @Post('faqs/:id/archive')
  @UseGuards(RolesGuard)
  @Roles(...EDITOR_ROLES)
  archiveFaq(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserPayload,
  ): Promise<FaqResponse> {
    return this.contentService.archiveFaq(id, user);
  }

  @Post('faqs/:id/restore')
  @UseGuards(RolesGuard)
  @Roles(...EDITOR_ROLES)
  restoreFaq(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserPayload,
  ): Promise<FaqResponse> {
    return this.contentService.restoreFaq(id, user);
  }

  @Post('faqs/reorder')
  @UseGuards(RolesGuard)
  @Roles(...EDITOR_ROLES)
  reorderFaq(@Body() dto: ReorderContentDto): Promise<readonly FaqResponse[]> {
    return this.contentService.reorderFaq(dto.id, dto.direction);
  }
}
