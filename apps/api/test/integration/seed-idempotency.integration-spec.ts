import { PrismaClient } from '@prisma/client';
import { runSeed } from '../../prisma/seed';

describe('idempotência do seed', () => {
  const prisma = new PrismaClient();

  afterAll(async () => {
    await prisma.$disconnect();
  });

  async function countAll() {
    const [
      users,
      roles,
      workflows,
      documentTypes,
      tags,
      resources,
      resourceTags,
      tips,
      faqs,
      tickets,
      messages,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.userRole.count(),
      prisma.workflow.count(),
      prisma.documentType.count(),
      prisma.tag.count(),
      prisma.resource.count(),
      prisma.resourceTag.count(),
      prisma.tip.count(),
      prisma.faq.count(),
      prisma.supportTicket.count(),
      prisma.ticketMessage.count(),
    ]);
    return {
      users,
      roles,
      workflows,
      documentTypes,
      tags,
      resources,
      resourceTags,
      tips,
      faqs,
      tickets,
      messages,
    };
  }

  it('correr o seed uma segunda vez não duplica nenhuma entidade', async () => {
    // `globalSetup` já correu o seed uma vez para toda a suite; esta segunda execução
    // confirma a idempotência (critério de aceitação da especificação).
    const before = await countAll();

    await runSeed(prisma);

    const after = await countAll();
    expect(after).toEqual(before);
  });

  it('cobre todos os estados editoriais, dificuldades e fluxos de recursos', async () => {
    const [draft, published, archived] = await Promise.all([
      prisma.resource.count({ where: { status: 'DRAFT' } }),
      prisma.resource.count({ where: { status: 'PUBLISHED' } }),
      prisma.resource.count({ where: { status: 'ARCHIVED' } }),
    ]);
    expect(draft).toBeGreaterThan(0);
    expect(published).toBeGreaterThan(0);
    expect(archived).toBeGreaterThan(0);

    const [iniciacao, intermedia, avancada] = await Promise.all([
      prisma.resource.count({ where: { difficulty: 'INICIACAO' } }),
      prisma.resource.count({ where: { difficulty: 'INTERMEDIA' } }),
      prisma.resource.count({ where: { difficulty: 'AVANCADA' } }),
    ]);
    expect(iniciacao).toBeGreaterThan(0);
    expect(intermedia).toBeGreaterThan(0);
    expect(avancada).toBeGreaterThan(0);

    const activeWorkflows = await prisma.workflow.count({
      where: { isActive: true },
    });
    expect(activeWorkflows).toBe(8);
  });

  it('cobre todas as categorias e prioridades de pedidos de suporte', async () => {
    const categories = [
      'ACCESS_PERMISSIONS',
      'REGISTRATION',
      'ROUTING',
      'SIGNATURE',
      'SEARCH_ARCHIVE',
      'TECHNICAL_ERROR',
      'OTHER',
    ] as const;
    for (const category of categories) {
      const count = await prisma.supportTicket.count({ where: { category } });
      expect(count).toBeGreaterThan(0);
    }

    const priorities = ['LOW', 'NORMAL', 'HIGH', 'BLOCKING'] as const;
    for (const priority of priorities) {
      const count = await prisma.supportTicket.count({ where: { priority } });
      expect(count).toBeGreaterThan(0);
    }

    const statuses = [
      'OPEN',
      'IN_PROGRESS',
      'WAITING_FOR_USER',
      'RESOLVED',
      'CLOSED',
    ] as const;
    for (const status of statuses) {
      const count = await prisma.supportTicket.count({ where: { status } });
      expect(count).toBeGreaterThan(0);
    }
  });

  it('nenhuma palavra-passe de utilizador é guardada em texto simples', async () => {
    const users = await prisma.user.findMany({
      select: { passwordHash: true },
    });
    expect(users.length).toBeGreaterThan(0);
    for (const user of users) {
      expect(user.passwordHash.startsWith('$argon2id$')).toBe(true);
      expect(user.passwordHash).not.toBe('Demo123!');
    }
  });

  it('existe pelo menos um utilizador com múltiplas funções e dois administradores', async () => {
    const usersWithRoles = await prisma.user.findMany({
      include: { roles: true },
    });
    const multiRoleUsers = usersWithRoles.filter(
      (user) => user.roles.length > 1,
    );
    expect(multiRoleUsers.length).toBeGreaterThanOrEqual(1);

    const admins = usersWithRoles.filter((user) =>
      user.roles.some((role) => role.role === 'ADMIN'),
    );
    expect(admins.length).toBeGreaterThanOrEqual(2);

    const inactiveUsers = usersWithRoles.filter(
      (user) => user.status === 'INACTIVE',
    );
    expect(inactiveUsers.length).toBeGreaterThanOrEqual(1);
  });
});
