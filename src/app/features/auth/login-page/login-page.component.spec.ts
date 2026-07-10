import { Router, provideRouter } from '@angular/router';
import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { AuthService } from '../../../core/auth/auth.service';
import { AppUser } from '../../../shared/models';
import { LoginPageComponent } from './login-page.component';

const mockUser: AppUser = {
  id: 'user-1',
  name: 'Marta Silva',
  email: 'marta.silva@dgadr.gov.pt',
  career: 'Técnico Superior',
  role: 'EMPLOYEE',
  status: 'active',
  lastAccess: '2026-07-08',
};

describe('LoginPageComponent', () => {
  let authService: AuthService;
  let router: Router;

  beforeEach(() => {
    document.documentElement.setAttribute('data-theme', 'dark');
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    authService = TestBed.inject(AuthService);
    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true);
  });

  it('renders labeled email and password fields', async () => {
    const fixture = TestBed.createComponent(LoginPageComponent);
    fixture.detectChanges();
    await fixture.whenStable();

    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('label[for="login-email"]')).toBeTruthy();
    expect(el.querySelector('label[for="login-password"]')).toBeTruthy();
  });

  it('shows validation errors and does not submit when the form is empty', async () => {
    const fixture = TestBed.createComponent(LoginPageComponent);
    fixture.detectChanges();
    await fixture.whenStable();

    const loginSpy = vi.spyOn(authService, 'login');
    (fixture.nativeElement.querySelector('form') as HTMLFormElement).requestSubmit();
    fixture.detectChanges();
    await fixture.whenStable();

    expect(loginSpy).not.toHaveBeenCalled();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('#login-email-error')?.textContent).toContain('obrigatório');
    expect(el.querySelector('#login-password-error')).toBeTruthy();
  });

  it('navigates to /inicio after a successful login', async () => {
    vi.spyOn(authService, 'login').mockReturnValue(of(mockUser));
    const fixture = TestBed.createComponent(LoginPageComponent);
    fixture.detectChanges();
    await fixture.whenStable();

    fixture.componentInstance['form'].setValue({
      email: 'marta.silva@dgadr.gov.pt',
      password: 'Demo123!',
    });
    fixture.componentInstance['submit']();
    fixture.detectChanges();
    await fixture.whenStable();

    expect(router.navigateByUrl).toHaveBeenCalledWith('/inicio');
  });

  it('shows the generic error message when the credentials are invalid', async () => {
    vi.spyOn(authService, 'login').mockReturnValue(
      throwError(
        () => new Error('Não foi possível iniciar sessão. Verifique o e-mail e a palavra-passe.'),
      ),
    );
    const fixture = TestBed.createComponent(LoginPageComponent);
    fixture.detectChanges();
    await fixture.whenStable();

    fixture.componentInstance['form'].setValue({
      email: 'desconhecido@dgadr.gov.pt',
      password: 'errado',
    });
    fixture.componentInstance['submit']();
    fixture.detectChanges();
    await fixture.whenStable();

    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('.fdr-login-page__error')?.textContent).toContain(
      'Não foi possível iniciar sessão',
    );
    expect(router.navigateByUrl).not.toHaveBeenCalled();
  });

  it('toggles password visibility', async () => {
    const fixture = TestBed.createComponent(LoginPageComponent);
    fixture.detectChanges();
    await fixture.whenStable();

    const passwordInput = fixture.nativeElement.querySelector(
      '#login-password',
    ) as HTMLInputElement;
    expect(passwordInput.type).toBe('password');

    (
      fixture.nativeElement.querySelector('.fdr-field__toggle-visibility') as HTMLButtonElement
    ).click();
    fixture.detectChanges();
    await fixture.whenStable();

    expect(passwordInput.type).toBe('text');
  });

  it('logs in with a dev role option when clicked', async () => {
    const loginSpy = vi.spyOn(authService, 'login').mockReturnValue(of(mockUser));
    const fixture = TestBed.createComponent(LoginPageComponent);
    fixture.detectChanges();
    await fixture.whenStable();

    (
      fixture.nativeElement.querySelector('.fdr-login-page__dev-tool-option') as HTMLButtonElement
    ).click();
    fixture.detectChanges();
    await fixture.whenStable();

    expect(loginSpy).toHaveBeenCalledWith('marta.silva@dgadr.gov.pt', 'Demo123!');
    expect(router.navigateByUrl).toHaveBeenCalledWith('/inicio');
  });
});
