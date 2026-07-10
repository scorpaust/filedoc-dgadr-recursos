import { provideRouter } from '@angular/router';
import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { AuthService } from '../../../core/auth/auth.service';
import { ToastService } from '../../../shared/components/toast/toast.service';
import { ChangePasswordPageComponent } from './change-password-page.component';

describe('ChangePasswordPageComponent', () => {
  let authService: AuthService;
  let toastService: ToastService;

  beforeEach(() => {
    document.documentElement.setAttribute('data-theme', 'dark');
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    authService = TestBed.inject(AuthService);
    toastService = TestBed.inject(ToastService);
  });

  it('marks fields as invalid and does not submit when required fields are empty', async () => {
    const fixture = TestBed.createComponent(ChangePasswordPageComponent);
    fixture.detectChanges();
    await fixture.whenStable();

    const changePasswordSpy = vi.spyOn(authService, 'changePassword');
    (fixture.nativeElement.querySelector('form') as HTMLFormElement).requestSubmit();
    fixture.detectChanges();
    await fixture.whenStable();

    expect(changePasswordSpy).not.toHaveBeenCalled();
    expect(fixture.nativeElement.querySelector('#current-password-error')).toBeTruthy();
  });

  it('shows a mismatch error when the confirmation does not match the new password', async () => {
    const fixture = TestBed.createComponent(ChangePasswordPageComponent);
    fixture.detectChanges();
    await fixture.whenStable();

    fixture.componentInstance['form'].setValue({
      currentPassword: 'Demo123!',
      newPassword: 'NovaPass1!',
      confirmPassword: 'Diferente1!',
    });
    fixture.componentInstance['confirmPasswordControl'].markAsTouched();
    fixture.detectChanges();
    await fixture.whenStable();

    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('#confirm-password-error')?.textContent).toContain('não corresponde');
  });

  it('shows a success toast and resets the form on success', async () => {
    vi.spyOn(authService, 'changePassword').mockReturnValue(of(undefined));
    const toastSpy = vi.spyOn(toastService, 'success');
    const fixture = TestBed.createComponent(ChangePasswordPageComponent);
    fixture.detectChanges();
    await fixture.whenStable();

    fixture.componentInstance['form'].setValue({
      currentPassword: 'Demo123!',
      newPassword: 'NovaPass1!',
      confirmPassword: 'NovaPass1!',
    });
    fixture.componentInstance['submit']();
    fixture.detectChanges();
    await fixture.whenStable();

    expect(toastSpy).toHaveBeenCalledWith('Palavra-passe alterada com sucesso.');
    expect(fixture.componentInstance['form'].value.currentPassword).toBe('');
  });

  it('shows a generic error message when the current password is wrong', async () => {
    vi.spyOn(authService, 'changePassword').mockReturnValue(
      throwError(() => new Error('Não foi possível alterar a palavra-passe.')),
    );
    const fixture = TestBed.createComponent(ChangePasswordPageComponent);
    fixture.detectChanges();
    await fixture.whenStable();

    fixture.componentInstance['form'].setValue({
      currentPassword: 'errada',
      newPassword: 'NovaPass1!',
      confirmPassword: 'NovaPass1!',
    });
    fixture.componentInstance['submit']();
    fixture.detectChanges();
    await fixture.whenStable();

    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('.fdr-change-password-page__error')?.textContent).toContain(
      'Não foi possível alterar a palavra-passe',
    );
  });
});
