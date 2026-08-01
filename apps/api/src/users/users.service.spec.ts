import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Prisma, Role, UserStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { USER_NOT_FOUND_MESSAGE, UsersService } from './users.service';

function makeUser(overrides: Record<string, unknown> = {}) {
  return {
    id: 'user-1',
    name: 'Ana Ferreira',
    email: 'ana.ferreira@dgadr.gov.pt',
    passwordHash: 'hash',
    status: UserStatus.ACTIVE,
    lastLoginAt: null,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    roles: [{ userId: 'user-1', role: Role.ADMIN }],
    ...overrides,
  };
}

describe('UsersService', () => {
  let service: UsersService;
  let prisma: {
    user: {
      findMany: jest.Mock;
      findUnique: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
    };
    session: { updateMany: jest.Mock };
    $transaction: jest.Mock;
  };
  let tx: {
    userRole: { deleteMany: jest.Mock; createMany: jest.Mock };
    user: { update: jest.Mock; findUniqueOrThrow: jest.Mock };
    session: { updateMany: jest.Mock };
    $queryRaw: jest.Mock;
  };

  beforeEach(async () => {
    tx = {
      userRole: {
        deleteMany: jest.fn(),
        createMany: jest.fn(),
      },
      user: { update: jest.fn(), findUniqueOrThrow: jest.fn() },
      session: { updateMany: jest.fn() },
      $queryRaw: jest.fn(),
    };
    prisma = {
      user: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      session: { updateMany: jest.fn() },
      $transaction: jest.fn(
        async (callback: (t: typeof tx) => Promise<unknown>) => callback(tx),
      ),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [UsersService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get(UsersService);
  });

  describe('list', () => {
    it('filtra por estado, função (interseção) e pesquisa por nome/e-mail', async () => {
      prisma.user.findMany.mockResolvedValue([makeUser()]);

      await service.list({
        status: 'active',
        roles: [Role.ADMIN, Role.SUPPORT_AGENT],
        q: 'ana',
      });

      expect(prisma.user.findMany).toHaveBeenCalledWith({
        where: {
          status: UserStatus.ACTIVE,
          roles: { some: { role: { in: [Role.ADMIN, Role.SUPPORT_AGENT] } } },
          OR: [
            { name: { contains: 'ana', mode: 'insensitive' } },
            { email: { contains: 'ana', mode: 'insensitive' } },
          ],
        },
        include: { roles: true },
        orderBy: { name: 'asc' },
      });
    });

    it('devolve "—" como último acesso quando o utilizador nunca iniciou sessão', async () => {
      prisma.user.findMany.mockResolvedValue([makeUser({ lastLoginAt: null })]);

      const [result] = await service.list({ status: 'all' });

      expect(result.lastAccess).toBe('—');
      expect(result.status).toBe('active');
    });
  });

  describe('create', () => {
    it('cria o utilizador com uma palavra-passe temporária nunca devolvida ao cliente', async () => {
      prisma.user.create.mockResolvedValue(makeUser({ roles: [] }));

      const result = await service.create({
        name: '  Marta Silva  ',
        email: 'Marta.Silva@dgadr.gov.pt',
        roles: [Role.EMPLOYEE],
      });

      expect(prisma.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            name: 'Marta Silva',
            email: 'marta.silva@dgadr.gov.pt',
            roles: { create: [{ role: Role.EMPLOYEE }] },
          }) as unknown,
        }),
      );
      expect(result).not.toHaveProperty('passwordHash');
    });

    it('traduz um conflito de e-mail (P2002) num erro amigável', async () => {
      prisma.user.create.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
          code: 'P2002',
          clientVersion: 'test',
        }),
      );

      await expect(
        service.create({
          name: 'Marta Silva',
          email: 'ana.ferreira@dgadr.gov.pt',
          roles: [Role.EMPLOYEE],
        }),
      ).rejects.toMatchObject({
        response: { fieldErrors: { email: expect.any(Array) as unknown } },
      });
    });
  });

  describe('updateName', () => {
    it('lança 404 para um id inexistente', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      await expect(
        service.updateName('inexistente', { name: 'Novo Nome' }),
      ).rejects.toThrow(new NotFoundException(USER_NOT_FOUND_MESSAGE));
    });

    it('atualiza o nome, sem espaços em branco', async () => {
      prisma.user.findUnique.mockResolvedValue(makeUser());
      prisma.user.update.mockResolvedValue(makeUser({ name: 'Novo Nome' }));

      await service.updateName('user-1', { name: '  Novo Nome  ' });

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: { name: 'Novo Nome' },
        include: { roles: true },
      });
    });
  });

  describe('assignRoles', () => {
    it('bloqueia a remoção de ADMIN quando o utilizador é o único administrador', async () => {
      prisma.user.findUnique.mockResolvedValue(makeUser());
      tx.$queryRaw.mockResolvedValue([{ userId: 'user-1' }]);

      await expect(
        service.assignRoles('user-1', { roles: [Role.EMPLOYEE] }),
      ).rejects.toMatchObject({
        status: 400,
        response: { fieldErrors: { roles: expect.any(Array) as unknown } },
      });
      expect(tx.userRole.deleteMany).not.toHaveBeenCalled();
    });

    it('permite remover ADMIN quando existem outros administradores', async () => {
      prisma.user.findUnique.mockResolvedValue(makeUser());
      tx.$queryRaw.mockResolvedValue([
        { userId: 'user-1' },
        { userId: 'user-2' },
      ]);
      tx.user.findUniqueOrThrow.mockResolvedValue(
        makeUser({ roles: [{ userId: 'user-1', role: Role.EMPLOYEE }] }),
      );

      await service.assignRoles('user-1', { roles: [Role.EMPLOYEE] });

      expect(tx.userRole.deleteMany).toHaveBeenCalledWith({
        where: { userId: 'user-1', role: { notIn: [Role.EMPLOYEE] } },
      });
      expect(tx.userRole.createMany).toHaveBeenCalledWith({
        data: [{ userId: 'user-1', role: Role.EMPLOYEE }],
        skipDuplicates: true,
      });
    });

    it('não verifica a regra do último ADMIN quando o utilizador mantém a função', async () => {
      prisma.user.findUnique.mockResolvedValue(makeUser());
      tx.user.findUniqueOrThrow.mockResolvedValue(makeUser());

      await service.assignRoles('user-1', {
        roles: [Role.ADMIN, Role.EMPLOYEE],
      });

      expect(tx.$queryRaw).not.toHaveBeenCalled();
    });

    it('traduz um conflito de serialização (P2034) numa resposta amigável de conflito', async () => {
      prisma.user.findUnique.mockResolvedValue(makeUser());
      prisma.$transaction.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('Serialization failure', {
          code: 'P2034',
          clientVersion: 'test',
        }),
      );

      await expect(
        service.assignRoles('user-1', { roles: [Role.EMPLOYEE] }),
      ).rejects.toBeInstanceOf(ConflictException);
    });
  });

  describe('deactivate', () => {
    it('bloqueia a desativação do último administrador', async () => {
      prisma.user.findUnique.mockResolvedValue(makeUser());
      tx.$queryRaw.mockResolvedValue([{ userId: 'user-1' }]);

      await expect(service.deactivate('user-1')).rejects.toMatchObject({
        status: 400,
      });
      expect(tx.user.update).not.toHaveBeenCalled();
    });

    it('desativa e invalida as sessões existentes na mesma transação', async () => {
      prisma.user.findUnique.mockResolvedValue(makeUser());
      tx.$queryRaw.mockResolvedValue([
        { userId: 'user-1' },
        { userId: 'user-2' },
      ]);
      tx.user.findUniqueOrThrow.mockResolvedValue(
        makeUser({ status: UserStatus.INACTIVE }),
      );

      const result = await service.deactivate('user-1');

      expect(tx.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: { status: UserStatus.INACTIVE },
      });
      expect(tx.session.updateMany).toHaveBeenCalledWith({
        where: { userId: 'user-1', revokedAt: null },
        data: { revokedAt: expect.any(Date) as unknown },
      });
      expect(result.status).toBe('inactive');
    });

    it('nunca bloqueia a desativação de quem não é administrador', async () => {
      prisma.user.findUnique.mockResolvedValue(
        makeUser({ roles: [{ userId: 'user-1', role: Role.EMPLOYEE }] }),
      );
      tx.$queryRaw.mockResolvedValue([{ userId: 'other-admin' }]);
      tx.user.findUniqueOrThrow.mockResolvedValue(
        makeUser({ status: UserStatus.INACTIVE }),
      );

      await service.deactivate('user-1');

      expect(tx.user.update).toHaveBeenCalled();
    });
  });

  describe('activate', () => {
    it('reativa uma conta desativada', async () => {
      prisma.user.findUnique.mockResolvedValue(
        makeUser({ status: UserStatus.INACTIVE }),
      );
      prisma.user.update.mockResolvedValue(
        makeUser({ status: UserStatus.ACTIVE }),
      );

      const result = await service.activate('user-1');

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: { status: UserStatus.ACTIVE },
        include: { roles: true },
      });
      expect(result.status).toBe('active');
    });
  });

  describe('invalidateSessions', () => {
    it('lança 404 para um id inexistente', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      await expect(service.invalidateSessions('inexistente')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('revoga apenas as sessões ainda ativas do utilizador', async () => {
      prisma.user.findUnique.mockResolvedValue(makeUser());

      await service.invalidateSessions('user-1');

      expect(prisma.session.updateMany).toHaveBeenCalledWith({
        where: { userId: 'user-1', revokedAt: null },
        data: { revokedAt: expect.any(Date) as unknown },
      });
    });
  });
});
