import { ActivatedRouteSnapshot, Router, UrlTree, provideRouter } from '@angular/router';
import { TestBed } from '@angular/core/testing';
import { AppUser } from '../../shared/models';
import { AuthService } from './auth.service';
import { roleGuard } from './role.guard';

const mockUser: AppUser = {
  id: 'user-3',
  name: 'João Antunes',
  email: 'joao.antunes@dgadr.gov.pt',
  career: 'Chefe de Divisão',
  roles: ['CONTENT_EDITOR', 'ADMIN'],
  status: 'active',
  lastAccess: '2026-07-05',
};

function routeWithRoles(roles: readonly string[]): ActivatedRouteSnapshot {
  return { data: { roles } } as unknown as ActivatedRouteSnapshot;
}

describe('roleGuard', () => {
  let authService: AuthService;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    authService = TestBed.inject(AuthService);
  });

  it('allows navigation when one of the current roles is in the allowed list', () => {
    authService.currentUser.set(mockUser);

    const result = TestBed.runInInjectionContext(() =>
      roleGuard(
        routeWithRoles(['CONTENT_EDITOR', 'SUPPORT_AGENT']),
        {} as unknown as Parameters<typeof roleGuard>[1],
      ),
    );

    expect(result).toBe(true);
  });

  it('redirects to /acesso-negado when none of the current roles are allowed', () => {
    authService.currentUser.set(mockUser);

    const result = TestBed.runInInjectionContext(() =>
      roleGuard(
        routeWithRoles(['SUPPORT_AGENT']),
        {} as unknown as Parameters<typeof roleGuard>[1],
      ),
    );

    const router = TestBed.inject(Router);
    expect(result).toEqual(router.createUrlTree(['/acesso-negado']));
    expect((result as UrlTree).toString()).toBe('/acesso-negado');
  });

  it('allows navigation to both routes protected by different roles for a user accumulating both', () => {
    authService.currentUser.set(mockUser);

    const contentResult = TestBed.runInInjectionContext(() =>
      roleGuard(
        routeWithRoles(['CONTENT_EDITOR', 'ADMIN']),
        {} as unknown as Parameters<typeof roleGuard>[1],
      ),
    );
    const adminResult = TestBed.runInInjectionContext(() =>
      roleGuard(routeWithRoles(['ADMIN']), {} as unknown as Parameters<typeof roleGuard>[1]),
    );

    expect(contentResult).toBe(true);
    expect(adminResult).toBe(true);
  });

  it('redirects to /acesso-negado when there is no authenticated user', () => {
    const result = TestBed.runInInjectionContext(() =>
      roleGuard(routeWithRoles(['ADMIN']), {} as unknown as Parameters<typeof roleGuard>[1]),
    );

    expect((result as UrlTree).toString()).toBe('/acesso-negado');
  });
});
