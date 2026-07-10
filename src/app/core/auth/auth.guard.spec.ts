import { Router, UrlTree, provideRouter } from '@angular/router';
import { TestBed } from '@angular/core/testing';
import { AuthService } from './auth.service';
import { authGuard } from './auth.guard';

describe('authGuard', () => {
  let authService: AuthService;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    authService = TestBed.inject(AuthService);
  });

  it('allows navigation when a user is authenticated', () => {
    authService.currentUser.set({
      id: 'user-1',
      name: 'Marta Silva',
      email: 'marta.silva@dgadr.gov.pt',
      career: 'Técnico Superior',
      role: 'EMPLOYEE',
      status: 'active',
      lastAccess: '2026-07-08',
    });

    const result = TestBed.runInInjectionContext(() =>
      authGuard(
        {} as unknown as Parameters<typeof authGuard>[0],
        {} as unknown as Parameters<typeof authGuard>[1],
      ),
    );

    expect(result).toBe(true);
  });

  it('redirects to /login when there is no authenticated user', () => {
    const result = TestBed.runInInjectionContext(() =>
      authGuard(
        {} as unknown as Parameters<typeof authGuard>[0],
        {} as unknown as Parameters<typeof authGuard>[1],
      ),
    );

    const router = TestBed.inject(Router);
    expect(result).toEqual(router.createUrlTree(['/login']));
    expect((result as UrlTree).toString()).toBe('/login');
  });
});
