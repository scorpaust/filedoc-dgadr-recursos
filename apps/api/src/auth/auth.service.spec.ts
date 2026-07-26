import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { hashPassword } from './password.util';
import { PrismaService } from '../prisma/prisma.service';

describe('AuthService', () => {
  let service: AuthService;
  let prisma: {
    user: { findUnique: jest.Mock; update: jest.Mock };
    session: { create: jest.Mock; updateMany: jest.Mock };
  };

  const activeUser = {
    id: 'user-1',
    name: 'Marta Silva',
    email: 'marta.silva@dgadr.gov.pt',
    status: 'ACTIVE',
    roles: [{ role: 'EMPLOYEE' }],
  };

  beforeEach(async () => {
    prisma = {
      user: { findUnique: jest.fn(), update: jest.fn() },
      session: { create: jest.fn(), updateMany: jest.fn() },
    };
    const configGet = jest.fn((key: string): unknown => {
      if (key === 'SESSION_SECRET') return 'segredo-de-teste-com-32-caracteres!!';
      if (key === 'SESSION_TTL') return 604800;
      throw new Error(`chave de configuração inesperada: ${key}`);
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prisma },
        { provide: ConfigService, useValue: { get: configGet } },
      ],
    }).compile();

    service = module.get(AuthService);
  });

  describe('login', () => {
    it('cria uma sessão para credenciais válidas', async () => {
      const passwordHash = await hashPassword('Demo123!');
      prisma.user.findUnique.mockResolvedValue({ ...activeUser, passwordHash });
      prisma.user.update.mockResolvedValue(undefined);
      prisma.session.create.mockResolvedValue(undefined);

      const result = await service.login('marta.silva@dgadr.gov.pt', 'Demo123!');

      expect(result.user).toEqual({
        id: 'user-1',
        name: 'Marta Silva',
        email: 'marta.silva@dgadr.gov.pt',
        roles: ['EMPLOYEE'],
      });
      expect(result.token).toBeTruthy();
      expect(prisma.session.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ userId: 'user-1' }) }),
      );
      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'user-1' } }),
      );
    });

    it('normaliza o e-mail (maiúsculas/espaços) antes de procurar o utilizador', async () => {
      const passwordHash = await hashPassword('Demo123!');
      prisma.user.findUnique.mockResolvedValue({ ...activeUser, passwordHash });

      await service.login('  Marta.Silva@DGADR.gov.pt  ', 'Demo123!');

      expect(prisma.user.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({ where: { email: 'marta.silva@dgadr.gov.pt' } }),
      );
    });

    it('rejeita com mensagem genérica quando o e-mail não existe', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(service.login('inexistente@dgadr.gov.pt', 'Demo123!')).rejects.toThrow(
        UnauthorizedException,
      );
      expect(prisma.session.create).not.toHaveBeenCalled();
    });

    it('nunca revela, pela mensagem, se a causa foi o e-mail ou a palavra-passe', async () => {
      const passwordHash = await hashPassword('Demo123!');
      prisma.user.findUnique.mockResolvedValueOnce(null);
      const emailInexistente: Error = await service
        .login('inexistente@dgadr.gov.pt', 'qualquer')
        .catch((error: Error) => error);

      prisma.user.findUnique.mockResolvedValueOnce({ ...activeUser, passwordHash });
      const passwordErrada: Error = await service
        .login('marta.silva@dgadr.gov.pt', 'errada')
        .catch((error: Error) => error);

      expect(emailInexistente).toBeInstanceOf(UnauthorizedException);
      expect(passwordErrada).toBeInstanceOf(UnauthorizedException);
      expect(emailInexistente.message).toBe(passwordErrada.message);
    });

    it('rejeita utilizadores inativos com a mesma mensagem genérica, sem criar sessão', async () => {
      const passwordHash = await hashPassword('Demo123!');
      prisma.user.findUnique.mockResolvedValue({
        ...activeUser,
        status: 'INACTIVE',
        passwordHash,
      });

      await expect(service.login('paulo.matos@dgadr.gov.pt', 'Demo123!')).rejects.toThrow(
        UnauthorizedException,
      );
      expect(prisma.session.create).not.toHaveBeenCalled();
    });

    it('devolve todas as funções quando o utilizador tem mais do que uma', async () => {
      const passwordHash = await hashPassword('Demo123!');
      prisma.user.findUnique.mockResolvedValue({
        ...activeUser,
        roles: [{ role: 'CONTENT_EDITOR' }, { role: 'ADMIN' }],
        passwordHash,
      });

      const result = await service.login('joao.antunes@dgadr.gov.pt', 'Demo123!');

      expect(result.user.roles).toEqual(['CONTENT_EDITOR', 'ADMIN']);
    });
  });

  describe('logout', () => {
    it('revoga apenas a sessão correspondente ao token, ainda não revogada', async () => {
      prisma.session.updateMany.mockResolvedValue({ count: 1 });

      await service.logout('um-token-qualquer');

      expect(prisma.session.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ revokedAt: null }),
          data: expect.objectContaining({ revokedAt: expect.any(Date) }),
        }),
      );
    });
  });

  describe('changePassword', () => {
    it('atualiza o hash quando a palavra-passe atual está correta', async () => {
      const passwordHash = await hashPassword('Demo123!');
      prisma.user.findUnique.mockResolvedValue({ id: 'user-1', passwordHash });
      prisma.user.update.mockResolvedValue(undefined);

      await service.changePassword('user-1', 'Demo123!', 'NovaPassword1!');

      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'user-1' } }),
      );
    });

    it('rejeita quando a palavra-passe atual está incorreta', async () => {
      const passwordHash = await hashPassword('Demo123!');
      prisma.user.findUnique.mockResolvedValue({ id: 'user-1', passwordHash });

      await expect(
        service.changePassword('user-1', 'errada', 'NovaPassword1!'),
      ).rejects.toThrow(UnauthorizedException);
      expect(prisma.user.update).not.toHaveBeenCalled();
    });
  });
});
