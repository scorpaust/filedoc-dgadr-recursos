import { Injectable } from '@nestjs/common';
import { ContentStatus, Faq, Role, Tip } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { FaqResponse, TipResponse } from './content.types';

const EDITOR_ROLES: readonly Role[] = [Role.CONTENT_EDITOR, Role.ADMIN];

const STATUS_TO_RESPONSE: Record<
  ContentStatus,
  'draft' | 'published' | 'archived'
> = {
  DRAFT: 'draft',
  PUBLISHED: 'published',
  ARCHIVED: 'archived',
};

/**
 * Regras de negócio de dicas/perguntas frequentes (fase-4-integracao-dicas-faq.md), reutilizando
 * diretamente o mesmo padrão de visibilidade já validado pelo `ResourcesService` (Fase 3 —
 * Integração): `PUBLISHED` sempre visível, `DRAFT` só a `CONTENT_EDITOR`/`ADMIN`, `ARCHIVED` nunca.
 */
@Injectable()
export class ContentService {
  constructor(private readonly prisma: PrismaService) {}

  async listTips(roles: readonly Role[]): Promise<readonly TipResponse[]> {
    const tips = await this.prisma.tip.findMany({
      where: { status: { in: this.visibleStatuses(roles) } },
      orderBy: { sortOrder: 'asc' },
    });
    return tips.map((tip) => this.toTipResponse(tip));
  }

  async listFaqs(roles: readonly Role[]): Promise<readonly FaqResponse[]> {
    const faqs = await this.prisma.faq.findMany({
      where: { status: { in: this.visibleStatuses(roles) } },
      orderBy: { sortOrder: 'asc' },
    });
    return faqs.map((faq) => this.toFaqResponse(faq));
  }

  private visibleStatuses(roles: readonly Role[]): ContentStatus[] {
    const canSeeDrafts = roles.some((role) => EDITOR_ROLES.includes(role));
    return canSeeDrafts
      ? [ContentStatus.PUBLISHED, ContentStatus.DRAFT]
      : [ContentStatus.PUBLISHED];
  }

  private toTipResponse(tip: Tip): TipResponse {
    return {
      id: tip.id,
      text: tip.content,
      status: STATUS_TO_RESPONSE[tip.status],
      sortOrder: tip.sortOrder,
    };
  }

  private toFaqResponse(faq: Faq): FaqResponse {
    return {
      id: faq.id,
      question: faq.question,
      answer: faq.answer,
      category: faq.category ?? undefined,
      status: STATUS_TO_RESPONSE[faq.status],
      sortOrder: faq.sortOrder,
    };
  }
}
