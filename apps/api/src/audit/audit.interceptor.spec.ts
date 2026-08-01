import { CallHandler, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { of } from 'rxjs';
import { AuditInterceptor } from './audit.interceptor';
import { AuditService } from './audit.service';

function makeContext(request: Record<string, unknown>): ExecutionContext {
  return {
    getHandler: () => ({}),
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;
}

function makeCallHandler(result: unknown): CallHandler {
  return { handle: () => of(result) };
}

describe('AuditInterceptor', () => {
  let reflector: { get: jest.Mock };
  let auditService: { record: jest.Mock };
  let interceptor: AuditInterceptor;

  beforeEach(() => {
    reflector = { get: jest.fn() };
    auditService = { record: jest.fn().mockResolvedValue(undefined) };
    interceptor = new AuditInterceptor(
      reflector as unknown as Reflector,
      auditService as unknown as AuditService,
    );
  });

  it('não regista nada quando o handler não tem @Audit', (done) => {
    reflector.get.mockReturnValue(undefined);
    const context = makeContext({});

    interceptor
      .intercept(context, makeCallHandler({ id: 'x' }))
      .subscribe(() => {
        expect(auditService.record).not.toHaveBeenCalled();
        done();
      });
  });

  it('usa o id do parâmetro de rota como entityId quando presente', (done) => {
    reflector.get.mockReturnValue({
      action: 'ticket.assign',
      entityType: 'ticket',
    });
    const context = makeContext({
      params: { id: 'ticket-1' },
      user: { id: 'agent-1' },
      correlationId: 'corr-1',
      body: {},
    });

    interceptor
      .intercept(
        context,
        makeCallHandler({ id: 'ticket-1', status: 'ASSIGNED' }),
      )
      .subscribe(() => {
        expect(auditService.record).toHaveBeenCalledWith({
          actorId: 'agent-1',
          action: 'ticket.assign',
          entityType: 'ticket',
          entityId: 'ticket-1',
          metadata: undefined,
          correlationId: 'corr-1',
        });
        done();
      });
  });

  it('recorre ao id da resposta quando não há parâmetro de rota (ex.: criação)', (done) => {
    reflector.get.mockReturnValue({
      action: 'user.create',
      entityType: 'user',
    });
    const context = makeContext({
      params: {},
      user: { id: 'admin-1' },
      body: {},
    });

    interceptor
      .intercept(context, makeCallHandler({ id: 'user-novo' }))
      .subscribe(() => {
        expect(auditService.record).toHaveBeenCalledWith(
          expect.objectContaining({ entityId: 'user-novo' }) as unknown,
        );
        done();
      });
  });

  it('recorre ao utilizador autenticado quando a resposta não tem id (ex.: logout)', (done) => {
    reflector.get.mockReturnValue({
      action: 'auth.logout',
      entityType: 'user',
    });
    const context = makeContext({
      params: {},
      user: { id: 'user-1' },
      body: {},
    });

    interceptor.intercept(context, makeCallHandler(undefined)).subscribe(() => {
      expect(auditService.record).toHaveBeenCalledWith(
        expect.objectContaining({
          entityId: 'user-1',
          actorId: 'user-1',
        }) as unknown,
      );
      done();
    });
  });

  it('só inclui no metadata as chaves declaradas em metadataKeys, nunca o corpo inteiro', (done) => {
    reflector.get.mockReturnValue({
      action: 'ticket.assign',
      entityType: 'ticket',
      metadataKeys: ['agentId'],
    });
    const context = makeContext({
      params: { id: 'ticket-1' },
      user: { id: 'agent-1' },
      body: {
        agentId: 'agent-2',
        note: 'sensível, nunca deve ir para o metadata',
      },
    });

    interceptor
      .intercept(context, makeCallHandler({ id: 'ticket-1' }))
      .subscribe(() => {
        expect(auditService.record).toHaveBeenCalledWith(
          expect.objectContaining({
            metadata: { agentId: 'agent-2' },
          }) as unknown,
        );
        done();
      });
  });
});
