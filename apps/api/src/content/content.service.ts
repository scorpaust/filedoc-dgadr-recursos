import { Injectable, NotFoundException } from '@nestjs/common';
import { ContentStatus, Faq, Role, Tip } from '@prisma/client';
import type { CurrentUserPayload } from '../auth/auth.types';
import { PrismaService } from '../prisma/prisma.service';
import { CreateFaqDto } from './dto/create-faq.dto';
import { CreateTipDto } from './dto/create-tip.dto';
import { ReorderDirection } from './dto/reorder-content.dto';
import { UpdateFaqDto } from './dto/update-faq.dto';
import { UpdateTipDto } from './dto/update-tip.dto';
import { FaqResponse, TipResponse } from './content.types';

export const TIP_NOT_FOUND_MESSAGE = 'Dica não encontrada.';
export const FAQ_NOT_FOUND_MESSAGE = 'Pergunta frequente não encontrada.';

const EDITOR_ROLES: readonly Role[] = [Role.CONTENT_EDITOR, Role.ADMIN];
const MAX_DERIVED_TITLE_LENGTH = 80;

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

  // ---------------------------------------------------------------------------
  // Gestão editorial (fase-7-integracao-gestao-conteudos.md) — `CONTENT_EDITOR`/`ADMIN`
  // apenas, garantido a montante pelo `RolesGuard` (`ContentController`). Ao contrário de
  // `listTips`/`listFaqs` (leitura pública), estes métodos nunca escondem `ARCHIVED`.
  // ---------------------------------------------------------------------------

  async listAllTips(): Promise<readonly TipResponse[]> {
    const tips = await this.prisma.tip.findMany({
      orderBy: { sortOrder: 'asc' },
    });
    return tips.map((tip) => this.toTipResponse(tip));
  }

  async listAllFaqs(): Promise<readonly FaqResponse[]> {
    const faqs = await this.prisma.faq.findMany({
      orderBy: { sortOrder: 'asc' },
    });
    return faqs.map((faq) => this.toFaqResponse(faq));
  }

  async createTip(
    dto: CreateTipDto,
    user: CurrentUserPayload,
  ): Promise<TipResponse> {
    const maxOrder = await this.maxSortOrder('tip');
    const tip = await this.prisma.tip.create({
      data: {
        title: this.deriveTipTitle(dto.content),
        content: dto.content,
        sortOrder: maxOrder + 1,
        createdById: user.id,
        updatedById: user.id,
      },
    });
    return this.toTipResponse(tip);
  }

  async updateTip(
    id: string,
    dto: UpdateTipDto,
    user: CurrentUserPayload,
  ): Promise<TipResponse> {
    await this.findTip(id);
    const tip = await this.prisma.tip.update({
      where: { id },
      data: {
        title: this.deriveTipTitle(dto.content),
        content: dto.content,
        updatedById: user.id,
      },
    });
    return this.toTipResponse(tip);
  }

  async publishTip(id: string, user: CurrentUserPayload): Promise<TipResponse> {
    return this.setTipStatus(id, ContentStatus.PUBLISHED, user);
  }

  async unpublishTip(
    id: string,
    user: CurrentUserPayload,
  ): Promise<TipResponse> {
    return this.setTipStatus(id, ContentStatus.DRAFT, user);
  }

  async archiveTip(id: string, user: CurrentUserPayload): Promise<TipResponse> {
    return this.setTipStatus(id, ContentStatus.ARCHIVED, user);
  }

  // Traz uma dica arquivada de volta a rascunho — nunca fica presa sem saída.
  async restoreTip(id: string, user: CurrentUserPayload): Promise<TipResponse> {
    return this.setTipStatus(id, ContentStatus.DRAFT, user);
  }

  async reorderTip(
    id: string,
    direction: ReorderDirection,
  ): Promise<readonly TipResponse[]> {
    const tips = await this.prisma.tip.findMany({
      orderBy: { sortOrder: 'asc' },
    });
    const swapped = this.swapSortOrder(tips, id, direction);
    if (!swapped) {
      throw new NotFoundException(TIP_NOT_FOUND_MESSAGE);
    }
    if (swapped.length > 0) {
      await Promise.all(
        swapped.map((tip) =>
          this.prisma.tip.update({
            where: { id: tip.id },
            data: { sortOrder: tip.sortOrder },
          }),
        ),
      );
    }
    return this.listAllTips();
  }

  async createFaq(
    dto: CreateFaqDto,
    user: CurrentUserPayload,
  ): Promise<FaqResponse> {
    const maxOrder = await this.maxSortOrder('faq');
    const faq = await this.prisma.faq.create({
      data: {
        question: dto.question,
        answer: dto.answer,
        category: dto.category,
        sortOrder: maxOrder + 1,
        createdById: user.id,
        updatedById: user.id,
      },
    });
    return this.toFaqResponse(faq);
  }

  async updateFaq(
    id: string,
    dto: UpdateFaqDto,
    user: CurrentUserPayload,
  ): Promise<FaqResponse> {
    await this.findFaq(id);
    const faq = await this.prisma.faq.update({
      where: { id },
      data: {
        question: dto.question,
        answer: dto.answer,
        category: dto.category,
        updatedById: user.id,
      },
    });
    return this.toFaqResponse(faq);
  }

  async publishFaq(id: string, user: CurrentUserPayload): Promise<FaqResponse> {
    return this.setFaqStatus(id, ContentStatus.PUBLISHED, user);
  }

  async unpublishFaq(
    id: string,
    user: CurrentUserPayload,
  ): Promise<FaqResponse> {
    return this.setFaqStatus(id, ContentStatus.DRAFT, user);
  }

  async archiveFaq(id: string, user: CurrentUserPayload): Promise<FaqResponse> {
    return this.setFaqStatus(id, ContentStatus.ARCHIVED, user);
  }

  // Traz uma pergunta arquivada de volta a rascunho — nunca fica presa sem saída.
  async restoreFaq(id: string, user: CurrentUserPayload): Promise<FaqResponse> {
    return this.setFaqStatus(id, ContentStatus.DRAFT, user);
  }

  async reorderFaq(
    id: string,
    direction: ReorderDirection,
  ): Promise<readonly FaqResponse[]> {
    const faqs = await this.prisma.faq.findMany({
      orderBy: { sortOrder: 'asc' },
    });
    const swapped = this.swapSortOrder(faqs, id, direction);
    if (!swapped) {
      throw new NotFoundException(FAQ_NOT_FOUND_MESSAGE);
    }
    if (swapped.length > 0) {
      await Promise.all(
        swapped.map((faq) =>
          this.prisma.faq.update({
            where: { id: faq.id },
            data: { sortOrder: faq.sortOrder },
          }),
        ),
      );
    }
    return this.listAllFaqs();
  }

  private async setTipStatus(
    id: string,
    status: ContentStatus,
    user: CurrentUserPayload,
  ): Promise<TipResponse> {
    await this.findTip(id);
    const tip = await this.prisma.tip.update({
      where: { id },
      data: { status, updatedById: user.id },
    });
    return this.toTipResponse(tip);
  }

  private async setFaqStatus(
    id: string,
    status: ContentStatus,
    user: CurrentUserPayload,
  ): Promise<FaqResponse> {
    await this.findFaq(id);
    const faq = await this.prisma.faq.update({
      where: { id },
      data: { status, updatedById: user.id },
    });
    return this.toFaqResponse(faq);
  }

  private async findTip(id: string): Promise<Tip> {
    const tip = await this.prisma.tip.findUnique({ where: { id } });
    if (!tip) {
      throw new NotFoundException(TIP_NOT_FOUND_MESSAGE);
    }
    return tip;
  }

  private async findFaq(id: string): Promise<Faq> {
    const faq = await this.prisma.faq.findUnique({ where: { id } });
    if (!faq) {
      throw new NotFoundException(FAQ_NOT_FOUND_MESSAGE);
    }
    return faq;
  }

  private async maxSortOrder(model: 'tip' | 'faq'): Promise<number> {
    const aggregate =
      model === 'tip'
        ? await this.prisma.tip.aggregate({ _max: { sortOrder: true } })
        : await this.prisma.faq.aggregate({ _max: { sortOrder: true } });
    return aggregate._max.sortOrder ?? 0;
  }

  /** Nunca pedido ao editor — `Tip.title` só existe no esquema, não na UI (Fase 5/8 — UI,
   * que só recolhe `text`/`content`); derivado da primeira linha ou dos primeiros
   * carateres do conteúdo. */
  private deriveTipTitle(content: string): string {
    const firstLine = content.trim().split('\n')[0].trim();
    if (firstLine.length <= MAX_DERIVED_TITLE_LENGTH) {
      return firstLine;
    }
    return `${firstLine.slice(0, MAX_DERIVED_TITLE_LENGTH).trimEnd()}…`;
  }

  /** Troca a `sortOrder` de um item com o seu vizinho imediato — mesmo algoritmo de
   * `TipsFaqMockService.swapOrder` (via de UI, Fase 8). Devolve `[]` quando já está na
   * posição limite (nada a trocar) e `undefined` quando o `id` não existe. */
  private swapSortOrder<
    T extends { readonly id: string; readonly sortOrder: number },
  >(
    items: readonly T[],
    id: string,
    direction: ReorderDirection,
  ): readonly T[] | undefined {
    const currentIndex = items.findIndex((item) => item.id === id);
    if (currentIndex === -1) {
      return undefined;
    }
    const targetIndex =
      direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= items.length) {
      return [];
    }
    const current = items[currentIndex];
    const target = items[targetIndex];
    return [
      { ...current, sortOrder: target.sortOrder },
      { ...target, sortOrder: current.sortOrder },
    ];
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
