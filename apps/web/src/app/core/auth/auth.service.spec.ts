import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Router, provideRouter } from '@angular/router';
import { TestBed } from '@angular/core/testing';
import { AuthService } from './auth.service';

const MARTA_RESPONSE = {
  id: 'user-1',
  name: 'Marta Silva',
  email: 'marta.silva@dgadr.gov.pt',
  roles: ['EMPLOYEE'],
};

describe('AuthService', () => {
  let service: AuthService;
  let httpMock: HttpTestingController;
  let router: Router;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('starts with no authenticated user', () => {
    expect(service.currentUser()).toBeNull();
    expect(service.roles()).toEqual([]);
    expect(service.isAuthenticated()).toBe(false);
  });

  describe('login', () => {
    it('autentica um utilizador válido e expõe-o como utilizador atual', () => {
      const next = vi.fn();
      service.login('marta.silva@dgadr.gov.pt', 'Demo123!').subscribe(next);

      const req = httpMock.expectOne('/auth/login');
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({
        email: 'marta.silva@dgadr.gov.pt',
        password: 'Demo123!',
      });
      req.flush(MARTA_RESPONSE);

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({ email: 'marta.silva@dgadr.gov.pt' }),
      );
      expect(service.currentUser()?.name).toBe('Marta Silva');
      expect(service.roles()).toEqual(['EMPLOYEE']);
      expect(service.isAuthenticated()).toBe(true);
    });

    it('expõe todas as funções para um utilizador com mais do que uma em simultâneo', () => {
      service.login('joao.antunes@dgadr.gov.pt', 'Demo123!').subscribe();

      httpMock.expectOne('/auth/login').flush({
        id: 'user-3',
        name: 'João Antunes',
        email: 'joao.antunes@dgadr.gov.pt',
        roles: ['CONTENT_EDITOR', 'ADMIN'],
      });

      expect(service.roles()).toEqual(['CONTENT_EDITOR', 'ADMIN']);
    });

    it('rejeita com a mensagem devolvida pela API quando as credenciais são inválidas', () => {
      const error = vi.fn();
      service.login('desconhecido@dgadr.gov.pt', 'errada').subscribe({ error });

      httpMock
        .expectOne('/auth/login')
        .flush(
          { message: 'Não foi possível iniciar sessão. Verifique o e-mail e a palavra-passe.' },
          { status: 401, statusText: 'Unauthorized' },
        );

      expect(error).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Não foi possível iniciar sessão. Verifique o e-mail e a palavra-passe.',
        }),
      );
      expect(service.isAuthenticated()).toBe(false);
    });

    it('usa uma mensagem genérica quando a resposta de erro não tem um corpo interpretável', () => {
      const error = vi.fn();
      service.login('desconhecido@dgadr.gov.pt', 'errada').subscribe({ error });

      httpMock.expectOne('/auth/login').flush(null, { status: 0, statusText: 'Unknown Error' });

      expect(error).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Não foi possível concluir o pedido. Tente novamente.',
        }),
      );
    });
  });

  it('logout limpa o utilizador atual e redireciona para /login de imediato, sem esperar pela API', () => {
    service.login('marta.silva@dgadr.gov.pt', 'Demo123!').subscribe();
    httpMock.expectOne('/auth/login').flush(MARTA_RESPONSE);
    expect(service.isAuthenticated()).toBe(true);

    service.logout();

    expect(service.currentUser()).toBeNull();
    expect(router.navigateByUrl).toHaveBeenCalledWith('/login');

    const logoutReq = httpMock.expectOne('/auth/logout');
    expect(logoutReq.request.method).toBe('POST');
    logoutReq.flush(null);
  });

  describe('changePassword', () => {
    it('envia a palavra-passe atual e a nova para a API', () => {
      const next = vi.fn();
      service.changePassword('Demo123!', 'NovaPassword1!').subscribe(next);

      const req = httpMock.expectOne('/auth/change-password');
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({
        currentPassword: 'Demo123!',
        newPassword: 'NovaPassword1!',
      });
      req.flush(null);

      expect(next).toHaveBeenCalled();
    });

    it('rejeita quando a palavra-passe atual está incorreta', () => {
      const error = vi.fn();
      service.changePassword('errada', 'NovaPassword1!').subscribe({ error });

      httpMock
        .expectOne('/auth/change-password')
        .flush(
          { message: 'Não foi possível alterar a palavra-passe.' },
          { status: 401, statusText: 'Unauthorized' },
        );

      expect(error).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  describe('restoreSession', () => {
    it('restaura o utilizador atual quando existe uma sessão válida (cookie)', () => {
      const next = vi.fn();
      service.restoreSession().subscribe(next);

      httpMock.expectOne('/auth/me').flush(MARTA_RESPONSE);

      expect(next).toHaveBeenCalled();
      expect(service.currentUser()?.email).toBe('marta.silva@dgadr.gov.pt');
      expect(service.isAuthenticated()).toBe(true);
    });

    it('não rejeita quando não existe sessão — apenas mantém o utilizador por autenticar', () => {
      const next = vi.fn();
      const error = vi.fn();
      service.restoreSession().subscribe({ next, error });

      httpMock.expectOne('/auth/me').flush(null, { status: 401, statusText: 'Unauthorized' });

      expect(error).not.toHaveBeenCalled();
      expect(next).toHaveBeenCalled();
      expect(service.isAuthenticated()).toBe(false);
    });
  });

  describe('clearSession', () => {
    it('limpa o utilizador atual sem chamar a API', () => {
      service.login('marta.silva@dgadr.gov.pt', 'Demo123!').subscribe();
      httpMock.expectOne('/auth/login').flush(MARTA_RESPONSE);
      expect(service.isAuthenticated()).toBe(true);

      service.clearSession();

      expect(service.currentUser()).toBeNull();
      httpMock.expectNone('/auth/logout');
    });
  });
});
