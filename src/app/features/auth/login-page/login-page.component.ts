import { Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  ViewChild,
  inject,
  signal,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from '../../../core/auth/auth.service';
import { mockCredentials } from '../../../core/auth/mock-credentials';
import { ButtonComponent } from '../../../shared/components/button/button.component';
import { IconComponent } from '../../../shared/components/icon/icon.component';
import { AppUser, USER_ROLE_LABELS } from '../../../shared/models';
import { users } from '../../../shared/mocks/users.mock';

interface DevRoleOption {
  readonly user: AppUser;
  readonly password: string;
  readonly roleLabel: string;
}

// Ferramenta de desenvolvimento — permite iniciar sessão rapidamente com um utilizador
// mock de cada função, para validar visualmente as áreas de Gestão nas fases seguintes.
// Deve ser removida ou desativada antes da integração com autenticação real.
function buildDevRoleOptions(): readonly DevRoleOption[] {
  return mockCredentials
    .map((credential): DevRoleOption | null => {
      const user = users.find((candidate) => candidate.email === credential.email);
      return user
        ? { user, password: credential.password, roleLabel: USER_ROLE_LABELS[user.role] }
        : null;
    })
    .filter((option): option is DevRoleOption => option !== null);
}

@Component({
  selector: 'fdr-login-page',
  imports: [ReactiveFormsModule, ButtonComponent, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './login-page.component.html',
  styleUrl: './login-page.component.scss',
})
export class LoginPageComponent implements AfterViewInit {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly formBuilder = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);

  @ViewChild('emailInput') private readonly emailInput?: ElementRef<HTMLInputElement>;

  protected readonly isSubmitting = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly showPassword = signal(false);
  protected readonly devRoleOptions = buildDevRoleOptions();

  protected readonly form = this.formBuilder.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required],
  });

  protected readonly emailControl = this.form.controls.email;
  protected readonly passwordControl = this.form.controls.password;

  ngAfterViewInit(): void {
    this.emailInput?.nativeElement.focus();
  }

  protected isEmailInvalid(): boolean {
    return this.emailControl.invalid && (this.emailControl.dirty || this.emailControl.touched);
  }

  protected emailErrorMessage(): string {
    if (this.emailControl.hasError('required')) {
      return 'O e-mail é obrigatório.';
    }
    if (this.emailControl.hasError('email')) {
      return 'Introduza um e-mail válido.';
    }
    return '';
  }

  protected isPasswordInvalid(): boolean {
    return (
      this.passwordControl.invalid && (this.passwordControl.dirty || this.passwordControl.touched)
    );
  }

  protected togglePasswordVisibility(): void {
    this.showPassword.update((visible) => !visible);
  }

  protected useDevRole(option: DevRoleOption): void {
    this.form.setValue({ email: option.user.email, password: option.password });
    this.submit();
  }

  protected submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.errorMessage.set(null);
    this.isSubmitting.set(true);
    const { email, password } = this.form.getRawValue();

    this.authService
      .login(email, password)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.isSubmitting.set(false);
          this.router.navigateByUrl('/inicio');
        },
        error: (error: Error) => {
          this.isSubmitting.set(false);
          this.errorMessage.set(error.message);
        },
      });
  }
}
