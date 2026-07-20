import { PrismaClient } from '@prisma/client';

describe('utilizadores por função — queries reais', () => {
  const prisma = new PrismaClient();

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('lista utilizadores por função através de um join, não de uma comparação de igualdade', async () => {
    const admins = await prisma.user.findMany({
      where: { roles: { some: { role: 'ADMIN' } } },
      select: { email: true },
      orderBy: { email: 'asc' },
    });

    expect(admins.map((u) => u.email)).toEqual([
      'ana.ferreira@dgadr.gov.pt',
      'joao.antunes@dgadr.gov.pt',
    ]);
  });

  it('um utilizador com múltiplas funções aparece corretamente em cada filtro correspondente', async () => {
    const [admins, contentEditors] = await Promise.all([
      prisma.user.findMany({
        where: { roles: { some: { role: 'ADMIN' } } },
        select: { email: true },
      }),
      prisma.user.findMany({
        where: { roles: { some: { role: 'CONTENT_EDITOR' } } },
        select: { email: true },
      }),
    ]);

    expect(admins.map((u) => u.email)).toContain('joao.antunes@dgadr.gov.pt');
    expect(contentEditors.map((u) => u.email)).toContain(
      'joao.antunes@dgadr.gov.pt',
    );
  });

  it('não confunde um utilizador com uma única função com um utilizador com múltiplas', async () => {
    const employees = await prisma.user.findMany({
      where: { roles: { some: { role: 'EMPLOYEE' } } },
      select: { email: true, roles: { select: { role: true } } },
    });

    const marta = employees.find((u) => u.email === 'marta.silva@dgadr.gov.pt');
    expect(marta?.roles).toHaveLength(1);
    expect(marta?.roles[0]?.role).toBe('EMPLOYEE');
  });

  it('filtra utilizadores ativos/inativos', async () => {
    const inactiveUsers = await prisma.user.findMany({
      where: { status: 'INACTIVE' },
      select: { email: true },
    });

    expect(inactiveUsers.map((u) => u.email)).toEqual([
      'paulo.matos@dgadr.gov.pt',
    ]);
  });
});
