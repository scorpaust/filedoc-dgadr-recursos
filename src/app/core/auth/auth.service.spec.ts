import { Router, provideRouter } from '@angular/router';
import { TestBed } from '@angular/core/testing';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  let service: AuthService;
  let router: Router;

  beforeEach(() => {
    vi.useFakeTimers();
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    service = TestBed.inject(AuthService);
    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('starts with no authenticated user', () => {
    expect(service.currentUser()).toBeNull();
    expect(service.currentRole()).toBeNull();
    expect(service.isAuthenticated()).toBe(false);
  });

  it('authenticates a valid mock user and exposes it as the current user', async () => {
    const next = vi.fn();
    service.login('marta.silva@dgadr.gov.pt', 'Demo123!').subscribe(next);

    await vi.advanceTimersByTimeAsync(600);

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({ email: 'marta.silva@dgadr.gov.pt' }),
    );
    expect(service.currentUser()?.name).toBe('Marta Silva');
    expect(service.currentRole()).toBe('EMPLOYEE');
    expect(service.isAuthenticated()).toBe(true);
  });

  it('normalizes the e-mail casing and surrounding spaces before matching', async () => {
    const next = vi.fn();
    service.login('  Marta.Silva@DGADR.gov.pt  ', 'Demo123!').subscribe(next);

    await vi.advanceTimersByTimeAsync(600);

    expect(next).toHaveBeenCalled();
    expect(service.currentUser()?.email).toBe('marta.silva@dgadr.gov.pt');
  });

  it('rejects an unknown e-mail with a generic error and keeps the user unauthenticated', async () => {
    const error = vi.fn();
    service.login('desconhecido@dgadr.gov.pt', 'Demo123!').subscribe({ error });

    await vi.advanceTimersByTimeAsync(600);

    expect(error).toHaveBeenCalledWith(expect.any(Error));
    expect(service.isAuthenticated()).toBe(false);
  });

  it('rejects a known e-mail with the wrong password using the same generic error', async () => {
    const error = vi.fn();
    service.login('marta.silva@dgadr.gov.pt', 'palavra-errada').subscribe({ error });

    await vi.advanceTimersByTimeAsync(600);

    expect(error).toHaveBeenCalledWith(expect.any(Error));
    expect(service.isAuthenticated()).toBe(false);
  });

  it('rejects an inactive user even with an otherwise valid credential', async () => {
    const error = vi.fn();
    service.login('paulo.matos@dgadr.gov.pt', 'Demo123!').subscribe({ error });

    await vi.advanceTimersByTimeAsync(600);

    expect(error).toHaveBeenCalled();
    expect(service.isAuthenticated()).toBe(false);
  });

  it('logs out by clearing the current user and redirecting to /login', async () => {
    service.login('marta.silva@dgadr.gov.pt', 'Demo123!').subscribe();
    await vi.advanceTimersByTimeAsync(600);
    expect(service.isAuthenticated()).toBe(true);

    service.logout();

    expect(service.currentUser()).toBeNull();
    expect(router.navigateByUrl).toHaveBeenCalledWith('/login');
  });

  it('changes the password when the current password is correct', async () => {
    service.login('marta.silva@dgadr.gov.pt', 'Demo123!').subscribe();
    await vi.advanceTimersByTimeAsync(600);

    const next = vi.fn();
    service.changePassword('Demo123!').subscribe(next);
    await vi.advanceTimersByTimeAsync(600);

    expect(next).toHaveBeenCalled();
  });

  it('rejects a password change when the current password is wrong', async () => {
    service.login('marta.silva@dgadr.gov.pt', 'Demo123!').subscribe();
    await vi.advanceTimersByTimeAsync(600);

    const error = vi.fn();
    service.changePassword('palavra-errada').subscribe({ error });
    await vi.advanceTimersByTimeAsync(600);

    expect(error).toHaveBeenCalledWith(expect.any(Error));
  });
});
