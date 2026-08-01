import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { UserService } from './user.service';

const API_USER = {
  id: 'user-1',
  name: 'Marta Silva',
  email: 'marta.silva@dgadr.gov.pt',
  roles: ['EMPLOYEE'],
  status: 'active',
  lastAccess: '2026-07-01T10:00:00.000Z',
};

function flushInitialAdminRoster(httpMock: HttpTestingController): void {
  httpMock.expectOne((req) => req.url === '/admin/users' && req.params.get('roles') === 'ADMIN').flush([]);
}

describe('UserService', () => {
  let service: UserService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(UserService);
    httpMock = TestBed.inject(HttpTestingController);
    // O construtor já dispara um pedido para conhecer o "roster" de administradores.
    flushInitialAdminRoster(httpMock);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('list envia os filtros como query params e mapeia para AppUser', () => {
    const next = vi.fn();
    service.list({ status: 'active', roles: ['EMPLOYEE', 'ADMIN'], query: 'marta' }).subscribe(next);

    const req = httpMock.expectOne(
      (r) =>
        r.url === '/admin/users' &&
        r.params.get('status') === 'active' &&
        r.params.getAll('roles')?.join(',') === 'EMPLOYEE,ADMIN' &&
        r.params.get('q') === 'marta',
    );
    expect(req.request.method).toBe('GET');
    req.flush([API_USER]);

    expect(next).toHaveBeenCalledWith([
      {
        id: 'user-1',
        name: 'Marta Silva',
        email: 'marta.silva@dgadr.gov.pt',
        roles: ['EMPLOYEE'],
        status: 'active',
        lastAccess: '2026-07-01T10:00:00.000Z',
      },
    ]);
  });

  it('list sem filtro de estado não envia status=all', () => {
    service.list({ status: 'all' }).subscribe();

    const req = httpMock.expectOne((r) => r.url === '/admin/users');
    expect(req.request.params.has('status')).toBe(false);
    req.flush([]);
  });

  it('create envia POST sem o campo career (não modelado na API)', () => {
    const next = vi.fn();
    service
      .create({ name: 'Marta Silva', email: 'marta.silva@dgadr.gov.pt', career: 'Técnico', roles: ['EMPLOYEE'] })
      .subscribe(next);

    const req = httpMock.expectOne('/admin/users');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({
      name: 'Marta Silva',
      email: 'marta.silva@dgadr.gov.pt',
      roles: ['EMPLOYEE'],
    });
    req.flush(API_USER);
    flushInitialAdminRoster(httpMock); // refresca o roster após criar

    expect(next).toHaveBeenCalledWith(expect.objectContaining({ id: 'user-1' }));
  });

  it('updateName envia PATCH /admin/users/:id', () => {
    const next = vi.fn();
    service.updateName('user-1', 'Novo Nome').subscribe(next);

    const req = httpMock.expectOne('/admin/users/user-1');
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ name: 'Novo Nome' });
    req.flush({ ...API_USER, name: 'Novo Nome' });

    expect(next).toHaveBeenCalledWith(expect.objectContaining({ name: 'Novo Nome' }));
  });

  it('assignRoles envia PUT /admin/users/:id/roles e refresca o roster de administradores', () => {
    const next = vi.fn();
    service.assignRoles('user-1', ['EMPLOYEE', 'ADMIN']).subscribe(next);

    const req = httpMock.expectOne('/admin/users/user-1/roles');
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({ roles: ['EMPLOYEE', 'ADMIN'] });
    req.flush({ ...API_USER, roles: ['EMPLOYEE', 'ADMIN'] });
    flushInitialAdminRoster(httpMock);

    expect(next).toHaveBeenCalledWith(expect.objectContaining({ roles: ['EMPLOYEE', 'ADMIN'] }));
  });

  it('activate/deactivate/invalidateSessions chamam os endpoints POST corretos', () => {
    service.activate('user-1').subscribe();
    const activateReq = httpMock.expectOne('/admin/users/user-1/activate');
    expect(activateReq.request.method).toBe('POST');
    activateReq.flush(API_USER);

    service.deactivate('user-1').subscribe();
    const deactivateReq = httpMock.expectOne('/admin/users/user-1/deactivate');
    expect(deactivateReq.request.method).toBe('POST');
    deactivateReq.flush({ ...API_USER, status: 'inactive' });

    const next = vi.fn();
    service.invalidateSessions('user-1').subscribe(next);
    const invalidateReq = httpMock.expectOne('/admin/users/user-1/invalidate-sessions');
    expect(invalidateReq.request.method).toBe('POST');
    invalidateReq.flush(null);
    expect(next).toHaveBeenCalled();
  });

  it('traduz a mensagem de erro devolvida pela API ao bloquear a remoção do último ADMIN', () => {
    const onError = vi.fn();
    service.assignRoles('user-1', ['EMPLOYEE']).subscribe({ error: onError });

    httpMock
      .expectOne('/admin/users/user-1/roles')
      .flush(
        { message: 'Não é possível remover a função de administrador do último utilizador que a possui.' },
        { status: 400, statusText: 'Bad Request' },
      );

    expect(onError).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'Não é possível remover a função de administrador do último utilizador que a possui.',
      }),
    );
  });

  describe('isLastAdminHolder', () => {
    it('é falso enquanto o roster inicial (vazio, sem administradores) não identificar ninguém', () => {
      expect(service.isLastAdminHolder('user-1')).toBe(false);
    });

    it('passa a refletir o roster devolvido pela API após uma atualização', () => {
      service.assignRoles('user-2', ['ADMIN']).subscribe();
      httpMock.expectOne('/admin/users/user-2/roles').flush({ ...API_USER, id: 'user-2', roles: ['ADMIN'] });
      httpMock
        .expectOne((r) => r.url === '/admin/users' && r.params.get('roles') === 'ADMIN')
        .flush([{ ...API_USER, id: 'user-2', roles: ['ADMIN'] }]);

      expect(service.isLastAdminHolder('user-2')).toBe(true);
      expect(service.isLastAdminHolder('user-1')).toBe(false);
    });
  });
});
