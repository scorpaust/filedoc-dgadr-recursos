import { Controller, Get, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/guards/auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { CurrentUserPayload } from '../auth/auth.types';
import { ContentService } from './content.service';
import { FaqResponse, TipResponse } from './content.types';

// A visibilidade por estado editorial é decidida no `ContentService`, não por função fixa da
// rota — mesmo padrão já adotado por `ResourcesController` (Fase 3 — Integração).
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
}
