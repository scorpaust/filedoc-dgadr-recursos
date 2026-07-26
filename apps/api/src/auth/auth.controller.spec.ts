import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import type { Response } from 'express';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import type { AuthenticatedRequest, CurrentUserPayload } from './auth.types';
import { SESSION_COOKIE_NAME } from './session-token.util';
import { PrismaService } from '../prisma/prisma.service';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: {
    login: jest.Mock;
    logout: jest.Mock;
    changePassword: jest.Mock;
  };
  let response: { cookie: jest.Mock; clearCookie: jest.Mock };

  beforeEach(async () => {
    authService = {
      login: jest.fn(),
      logout: jest.fn(),
      changePassword: jest.fn(),
    };
    response = { cookie: jest.fn(), clearCookie: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        { provide: AuthService, useValue: authService },
        {
          provide: ConfigService,
          useValue: { get: jest.fn().mockReturnValue('development') },
        },
        // AuthGuard é instanciado pelo Nest ao compilar o módulo (referenciado por
        // @UseGuards nos métodos protegidos), mesmo que os testes abaixo chamem os
        // métodos do controller diretamente, sem passar pelo pipeline HTTP — só
        // precisa de existir no contentor de DI, nunca é efetivamente chamado aqui
        // (o comportamento do próprio AuthGuard está coberto por auth.guard.spec.ts).
        { provide: PrismaService, useValue: {} },
      ],
    }).compile();

    controller = module.get(AuthController);
  });

  it('login devolve o utilizador e define o cookie de sessão', async () => {
    authService.login.mockResolvedValue({
      token: 'token-abc',
      expiresAt: new Date('2026-01-01T00:00:00.000Z'),
      user: {
        id: 'user-1',
        name: 'Marta Silva',
        email: 'marta.silva@dgadr.gov.pt',
        roles: ['EMPLOYEE'],
      },
    });

    const result = await controller.login(
      { email: 'marta.silva@dgadr.gov.pt', password: 'Demo123!' },
      response as unknown as Response,
    );

    expect(result).toEqual({
      id: 'user-1',
      name: 'Marta Silva',
      email: 'marta.silva@dgadr.gov.pt',
      roles: ['EMPLOYEE'],
    });
    expect(response.cookie).toHaveBeenCalledWith(
      SESSION_COOKIE_NAME,
      'token-abc',
      expect.objectContaining({ httpOnly: true, sameSite: 'lax', path: '/' }),
    );
  });

  it('logout revoga a sessão quando existe cookie e limpa-o sempre', async () => {
    const request = {
      cookies: { [SESSION_COOKIE_NAME]: 'token-abc' },
    } as unknown as AuthenticatedRequest;

    await controller.logout(request, response as unknown as Response);

    expect(authService.logout).toHaveBeenCalledWith('token-abc');
    expect(response.clearCookie).toHaveBeenCalledWith(SESSION_COOKIE_NAME, {
      path: '/',
    });
  });

  it('logout não chama o serviço quando não existe cookie, mas continua a limpá-lo', async () => {
    const request = { cookies: {} } as unknown as AuthenticatedRequest;

    await controller.logout(request, response as unknown as Response);

    expect(authService.logout).not.toHaveBeenCalled();
    expect(response.clearCookie).toHaveBeenCalled();
  });

  it('me devolve o utilizador anexado ao pedido pelo AuthGuard', () => {
    const user: CurrentUserPayload = {
      id: 'user-1',
      name: 'João Antunes',
      email: 'joao.antunes@dgadr.gov.pt',
      roles: ['CONTENT_EDITOR', 'ADMIN'],
    };

    expect(controller.me(user)).toEqual(user);
  });

  it('change-password delega no serviço com o id do utilizador autenticado', async () => {
    const user: CurrentUserPayload = {
      id: 'user-1',
      name: 'Marta Silva',
      email: 'marta.silva@dgadr.gov.pt',
      roles: ['EMPLOYEE'],
    };

    await controller.changePassword(user, {
      currentPassword: 'Demo123!',
      newPassword: 'NovaPassword1!',
    });

    expect(authService.changePassword).toHaveBeenCalledWith(
      'user-1',
      'Demo123!',
      'NovaPassword1!',
    );
  });
});
