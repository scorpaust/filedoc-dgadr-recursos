import { Prisma, PrismaClient } from '@prisma/client';
import {
  assertCanRemoveAdminRole,
  LastAdminError,
} from '../../src/users/admin-guard.util';
import { generateUniqueTicketReference } from '../../src/support/ticket-reference.util';

async function expectPrismaErrorCode(
  operation: Promise<unknown>,
  expectedCode: string,
): Promise<void> {
  try {
    await operation;
    throw new Error(
      `Esperava-se que a operação falhasse com o código Prisma "${expectedCode}", mas teve sucesso.`,
    );
  } catch (error) {
    if (!(error instanceof Prisma.PrismaClientKnownRequestError)) {
      throw error;
    }
    expect(error.code).toBe(expectedCode);
  }
}

describe('restrições de negócio — verificação prática', () => {
  const prisma = new PrismaClient();

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('eliminação de taxonomias em uso', () => {
    it('bloqueia a eliminação de um Workflow associado a recursos', async () => {
      const workflow = await prisma.workflow.findUniqueOrThrow({
        where: { slug: 'criacao-e-registo' },
      });

      await expectPrismaErrorCode(
        prisma.workflow.delete({ where: { id: workflow.id } }),
        'P2003',
      );
    });

    it('bloqueia a eliminação de um DocumentType associado a recursos', async () => {
      const documentType = await prisma.documentType.findUniqueOrThrow({
        where: { slug: 'oficio' },
      });

      await expectPrismaErrorCode(
        prisma.documentType.delete({ where: { id: documentType.id } }),
        'P2003',
      );
    });

    it('bloqueia a eliminação de uma Tag associada a recursos', async () => {
      const tag = await prisma.tag.findUniqueOrThrow({
        where: { slug: 'registo' },
      });

      await expectPrismaErrorCode(
        prisma.tag.delete({ where: { id: tag.id } }),
        'P2003',
      );
    });
  });

  describe('unicidade de slug e de referência', () => {
    it('impede criar um recurso com um slug já existente', async () => {
      const existing = await prisma.resource.findUniqueOrThrow({
        where: { slug: 'criar-um-novo-processo-de-correspondencia' },
      });
      const [workflow, documentType, author] = await Promise.all([
        prisma.workflow.findUniqueOrThrow({ where: { slug: 'pesquisa' } }),
        prisma.documentType.findUniqueOrThrow({ where: { slug: 'diversos' } }),
        prisma.user.findUniqueOrThrow({
          where: { email: 'ana.ferreira@dgadr.gov.pt' },
        }),
      ]);

      await expectPrismaErrorCode(
        prisma.resource.create({
          data: {
            slug: existing.slug,
            title: 'Duplicado apenas para teste',
            summary: 'Resumo de teste.',
            description: 'Descrição de teste.',
            resourceType: 'PDF_GUIDE',
            difficulty: 'INICIACAO',
            status: 'DRAFT',
            workflowId: workflow.id,
            documentTypeId: documentType.id,
            createdById: author.id,
            updatedById: author.id,
          },
        }),
        'P2002',
      );
    });

    it('impede criar um pedido de suporte com uma referência já existente', async () => {
      const existing = await prisma.supportTicket.findUniqueOrThrow({
        where: { reference: 'SUP-2026-041392' },
      });
      const requester = await prisma.user.findUniqueOrThrow({
        where: { email: 'marta.silva@dgadr.gov.pt' },
      });

      await expectPrismaErrorCode(
        prisma.supportTicket.create({
          data: {
            reference: existing.reference,
            subject: 'Duplicado apenas para teste',
            description: 'Descrição de teste.',
            category: 'OTHER',
            priority: 'LOW',
            requesterId: requester.id,
          },
        }),
        'P2002',
      );
    });

    it('a referência gerada pelo utilitário nunca colide com as já existentes e pode ser usada para criar um pedido real', async () => {
      const existingReferences = new Set(
        (
          await prisma.supportTicket.findMany({ select: { reference: true } })
        ).map((t) => t.reference),
      );
      const requester = await prisma.user.findUniqueOrThrow({
        where: { email: 'marta.silva@dgadr.gov.pt' },
      });
      const reference = generateUniqueTicketReference(existingReferences);

      expect(existingReferences.has(reference)).toBe(false);

      const created = await prisma.supportTicket.create({
        data: {
          reference,
          subject: 'Pedido de teste (utilitário de referência)',
          description:
            'Criado apenas para validar a unicidade da referência gerada.',
          category: 'OTHER',
          priority: 'LOW',
          requesterId: requester.id,
        },
      });

      // Limpeza: este pedido não faz parte dos dados de seed e não deve persistir entre execuções.
      await prisma.supportTicket.delete({ where: { id: created.id } });
    });
  });

  describe('regra do último ADMIN', () => {
    it('bloqueia remover ADMIN do último administrador ativo, com dados reais da base de dados', async () => {
      const adminsBefore = await prisma.userRole.findMany({
        where: { role: 'ADMIN' },
      });
      expect(adminsBefore).toHaveLength(2);
      const [firstAdmin, secondAdmin] = adminsBefore;

      // Reduz temporariamente os administradores do seed a um só, replicando o cenário da
      // tarefa F ("reduzindo os ADMIN do seed a um, temporariamente, num teste").
      await prisma.userRole.delete({
        where: { userId_role: { userId: firstAdmin.userId, role: 'ADMIN' } },
      });

      try {
        const remainingAdminIds = (
          await prisma.userRole.findMany({ where: { role: 'ADMIN' } })
        ).map((row) => row.userId);
        expect(remainingAdminIds).toEqual([secondAdmin.userId]);

        expect(() =>
          assertCanRemoveAdminRole(remainingAdminIds, secondAdmin.userId),
        ).toThrow(LastAdminError);
        expect(() =>
          assertCanRemoveAdminRole(remainingAdminIds, firstAdmin.userId),
        ).not.toThrow();
      } finally {
        // Repõe o estado semeado (dois administradores), para não afetar outros testes.
        await prisma.userRole.upsert({
          where: { userId_role: { userId: firstAdmin.userId, role: 'ADMIN' } },
          update: {},
          create: { userId: firstAdmin.userId, role: 'ADMIN' },
        });
      }

      const adminsAfter = await prisma.userRole.findMany({
        where: { role: 'ADMIN' },
      });
      expect(adminsAfter).toHaveLength(2);
    });
  });
});
