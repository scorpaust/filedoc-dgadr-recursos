import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { AuditLogService } from './audit-log.service';

describe('AuditLogService', () => {
  let service: AuditLogService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(AuditLogService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('pede GET /admin/audit-log e mapeia as entidades técnicas para os rótulos em português', () => {
    const next = vi.fn();
    service.list().subscribe(next);

    const req = httpMock.expectOne((r) => r.url === '/admin/audit-log');
    expect(req.request.method).toBe('GET');
    req.flush({
      items: [
        {
          id: 'audit-1',
          actor: 'Ana Ferreira',
          action: 'ticket.assign',
          entityType: 'ticket',
          entityId: 'ticket-1',
          createdAt: '2026-07-12T09:15:00.000Z',
        },
        {
          id: 'audit-2',
          actor: 'João Antunes',
          action: 'resource.publish',
          entityType: 'resource',
          entityId: 'resource-1',
          createdAt: '2026-07-11T09:15:00.000Z',
        },
        {
          id: 'audit-3',
          actor: 'Sistema',
          action: 'auth.login',
          entityType: 'user',
          entityId: 'user-1',
          createdAt: '2026-07-10T09:15:00.000Z',
        },
      ],
      total: 3,
    });

    expect(next).toHaveBeenCalledWith([
      {
        id: 'audit-1',
        actor: 'Ana Ferreira',
        action: 'ticket.assign',
        entityType: 'pedido de suporte',
        createdAt: '2026-07-12T09:15:00.000Z',
      },
      {
        id: 'audit-2',
        actor: 'João Antunes',
        action: 'resource.publish',
        entityType: 'recurso',
        createdAt: '2026-07-11T09:15:00.000Z',
      },
      {
        id: 'audit-3',
        actor: 'Sistema',
        action: 'auth.login',
        entityType: 'utilizador',
        createdAt: '2026-07-10T09:15:00.000Z',
      },
    ]);
  });
});
