import { PrismaClient } from '@prisma/client';
import { supportTicketSeedData } from '../seed-data/support-tickets.data';
import { toUtcDate } from './utc-date';

export interface SeedSupportTicketsParams {
  readonly userIdByKey: ReadonlyMap<string, string>;
  readonly resourceIdBySlug: ReadonlyMap<string, string>;
}

/**
 * Idempotente: `SupportTicket` por `reference` (único, tarefa D), `TicketMessage` por `id`
 * determinístico (sem outro campo único disponível).
 */
export async function seedSupportTickets(
  prisma: PrismaClient,
  { userIdByKey, resourceIdBySlug }: SeedSupportTicketsParams,
): Promise<void> {
  for (const ticket of supportTicketSeedData) {
    const requesterId = userIdByKey.get(ticket.requesterKey);
    if (!requesterId) {
      throw new Error(
        `Solicitante de seed desconhecido "${ticket.requesterKey}" para o pedido "${ticket.id}".`,
      );
    }

    const assigneeId = ticket.assigneeKey
      ? userIdByKey.get(ticket.assigneeKey)
      : undefined;
    if (ticket.assigneeKey && !assigneeId) {
      throw new Error(
        `Responsável de seed desconhecido "${ticket.assigneeKey}" para o pedido "${ticket.id}".`,
      );
    }

    const relatedResourceId = ticket.relatedResourceSlug
      ? resourceIdBySlug.get(ticket.relatedResourceSlug)
      : undefined;
    if (ticket.relatedResourceSlug && !relatedResourceId) {
      throw new Error(
        `Recurso relacionado de seed desconhecido "${ticket.relatedResourceSlug}" para o pedido "${ticket.id}".`,
      );
    }

    const sharedFields = {
      subject: ticket.subject,
      description: ticket.description,
      category: ticket.category,
      priority: ticket.priority,
      status: ticket.status,
      requesterId,
      assigneeId: assigneeId ?? null,
      relatedResourceId: relatedResourceId ?? null,
      resolvedAt: ticket.resolvedAt ? toUtcDate(ticket.resolvedAt) : null,
      closedAt: ticket.closedAt ? toUtcDate(ticket.closedAt) : null,
      createdAt: toUtcDate(ticket.createdAt),
    };

    const record = await prisma.supportTicket.upsert({
      where: { reference: ticket.reference },
      update: sharedFields,
      create: { reference: ticket.reference, ...sharedFields },
    });

    for (const message of ticket.messages) {
      const authorId = userIdByKey.get(message.authorKey);
      if (!authorId) {
        throw new Error(
          `Autor de seed desconhecido "${message.authorKey}" para a mensagem "${message.id}".`,
        );
      }

      await prisma.ticketMessage.upsert({
        where: { id: message.id },
        update: {
          content: message.content,
          visibility: message.visibility,
          authorId,
          createdAt: toUtcDate(message.createdAt),
        },
        create: {
          id: message.id,
          ticketId: record.id,
          authorId,
          content: message.content,
          visibility: message.visibility,
          createdAt: toUtcDate(message.createdAt),
        },
      });
    }
  }
}
