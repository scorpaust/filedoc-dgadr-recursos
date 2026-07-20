import { ContentStatus, PrismaClient } from '@prisma/client';
import { faqSeedData } from '../seed-data/faqs.data';
import { tipSeedData } from '../seed-data/tips.data';
import { toUtcDate } from './utc-date';

export interface SeedTipsAndFaqsParams {
  readonly userIdByKey: ReadonlyMap<string, string>;
}

/** Idempotente: `upsert` por `id` determinístico — `Tip`/`Faq` não têm outro campo único. */
export async function seedTipsAndFaqs(
  prisma: PrismaClient,
  { userIdByKey }: SeedTipsAndFaqsParams,
): Promise<void> {
  for (const tip of tipSeedData) {
    const authorId = userIdByKey.get(tip.authorKey);
    if (!authorId) {
      throw new Error(
        `Autor de seed desconhecido "${tip.authorKey}" para a dica "${tip.id}".`,
      );
    }

    const publishedAt =
      tip.status === ContentStatus.PUBLISHED && tip.publishedAt
        ? toUtcDate(tip.publishedAt)
        : null;

    const sharedFields = {
      title: tip.title,
      content: tip.content,
      status: tip.status,
      sortOrder: tip.sortOrder,
      publishedAt,
    };

    await prisma.tip.upsert({
      where: { id: tip.id },
      update: { ...sharedFields, updatedById: authorId },
      create: {
        id: tip.id,
        ...sharedFields,
        createdById: authorId,
        updatedById: authorId,
      },
    });
  }

  for (const faq of faqSeedData) {
    const authorId = userIdByKey.get(faq.authorKey);
    if (!authorId) {
      throw new Error(
        `Autor de seed desconhecido "${faq.authorKey}" para a pergunta "${faq.id}".`,
      );
    }

    const publishedAt =
      faq.status === ContentStatus.PUBLISHED && faq.publishedAt
        ? toUtcDate(faq.publishedAt)
        : null;

    const sharedFields = {
      question: faq.question,
      answer: faq.answer,
      category: faq.category ?? null,
      status: faq.status,
      sortOrder: faq.sortOrder,
      publishedAt,
    };

    await prisma.faq.upsert({
      where: { id: faq.id },
      update: { ...sharedFields, updatedById: authorId },
      create: {
        id: faq.id,
        ...sharedFields,
        createdById: authorId,
        updatedById: authorId,
      },
    });
  }
}
