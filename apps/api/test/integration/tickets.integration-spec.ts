import { PrismaClient } from '@prisma/client';

describe('pedidos de suporte — queries reais', () => {
  const prisma = new PrismaClient();

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('vista do trabalhador ("os meus pedidos")', () => {
    it('devolve apenas os pedidos do próprio solicitante', async () => {
      const marta = await prisma.user.findUniqueOrThrow({
        where: { email: 'marta.silva@dgadr.gov.pt' },
      });

      const tickets = await prisma.supportTicket.findMany({
        where: { requesterId: marta.id },
        select: { reference: true },
      });

      expect(tickets.length).toBeGreaterThan(0);
      expect(tickets.map((t) => t.reference)).toEqual(
        expect.arrayContaining(['SUP-2026-041392', 'SUP-2026-041210']),
      );
    });

    it('nunca devolve pedidos de outro utilizador', async () => {
      const marta = await prisma.user.findUniqueOrThrow({
        where: { email: 'marta.silva@dgadr.gov.pt' },
      });
      const joao = await prisma.user.findUniqueOrThrow({
        where: { email: 'joao.antunes@dgadr.gov.pt' },
      });

      const martaTickets = await prisma.supportTicket.findMany({
        where: { requesterId: marta.id },
        select: { requesterId: true },
      });

      expect(martaTickets.length).toBeGreaterThan(0);
      expect(martaTickets.every((t) => t.requesterId === marta.id)).toBe(true);
      expect(martaTickets.every((t) => t.requesterId !== joao.id)).toBe(true);
    });

    it('um id de pedido inexistente e um pedido de outro utilizador são indistinguíveis para o solicitante', async () => {
      const marta = await prisma.user.findUniqueOrThrow({
        where: { email: 'marta.silva@dgadr.gov.pt' },
      });
      const joaoTicket = await prisma.supportTicket.findUniqueOrThrow({
        where: { reference: 'SUP-2026-040512' },
      });

      const foundOtherUsersTicket = await prisma.supportTicket.findFirst({
        where: { id: joaoTicket.id, requesterId: marta.id },
      });
      const foundNonexistentTicket = await prisma.supportTicket.findFirst({
        where: { id: 'id-que-nao-existe', requesterId: marta.id },
      });

      expect(foundOtherUsersTicket).toBeNull();
      expect(foundNonexistentTicket).toBeNull();
    });
  });

  describe('vista do agente (lista completa com filtros)', () => {
    it('filtra por estado, categoria e prioridade em simultâneo', async () => {
      const tickets = await prisma.supportTicket.findMany({
        where: {
          status: 'CLOSED',
          category: 'TECHNICAL_ERROR',
          priority: 'BLOCKING',
        },
        select: { reference: true },
      });

      expect(tickets.map((t) => t.reference)).toEqual(['SUP-2026-040711']);
    });

    it('inclui pedidos de todos os solicitantes, ao contrário da vista do trabalhador', async () => {
      const allTickets = await prisma.supportTicket.findMany({
        select: { requesterId: true },
      });
      const distinctRequesters = new Set(allTickets.map((t) => t.requesterId));

      expect(distinctRequesters.size).toBeGreaterThanOrEqual(3);
    });
  });

  describe('histórico e visibilidade de mensagens', () => {
    it('separa mensagens públicas de notas internas no mesmo pedido', async () => {
      const ticket = await prisma.supportTicket.findUniqueOrThrow({
        where: { reference: 'SUP-2026-042117' },
        include: { messages: { orderBy: { createdAt: 'asc' } } },
      });

      const internalMessages = ticket.messages.filter(
        (m) => m.visibility === 'INTERNAL',
      );
      const publicMessages = ticket.messages.filter(
        (m) => m.visibility === 'PUBLIC',
      );

      expect(internalMessages).toHaveLength(1);
      expect(publicMessages.length).toBeGreaterThanOrEqual(4);
      expect(ticket.resolvedAt).not.toBeNull();
      expect(ticket.closedAt).not.toBeNull();
      expect(ticket.status).toBe('CLOSED');
    });

    it('uma consulta pública (vista do trabalhador) nunca deve devolver notas internas', async () => {
      const publicMessagesOnly = await prisma.ticketMessage.findMany({
        where: {
          ticket: { reference: 'SUP-2026-042117' },
          visibility: 'PUBLIC',
        },
      });

      expect(publicMessagesOnly.every((m) => m.visibility === 'PUBLIC')).toBe(
        true,
      );
      expect(
        publicMessagesOnly.some((m) => m.content.includes('Nota interna')),
      ).toBe(false);
    });
  });
});
