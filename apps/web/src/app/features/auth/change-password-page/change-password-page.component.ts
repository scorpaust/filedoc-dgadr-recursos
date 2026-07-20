import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import { AuthService } from '../../../core/auth/auth.service';
import { ButtonComponent } from '../../../shared/components/button/button.component';
import { IconComponent } from '../../../shared/components/icon/icon.component';
import { ToastService } from '../../../shared/components/toast/toast.service';

function passwordsMatchValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const newPassword = control.get('newPassword')?.value;
    const confirmPassword = control.get('confirmPassword')?.value;
    if (!newPassword || !confirmPassword) {
      return null;
    }
    return newPassword === confirmPassword ? null : { passwordsMismatch: true };
  };
}

@Component({
  selector: 'fdr-change-password-page',
  imports: [ReactiveFormsModule, ButtonComponent, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './change-password-page.component.html',
  styleUrl: './change-password-page.component.scss',
})
export class ChangePasswordPageComponent {
  private readonly authService = inject(AuthService);
  private readonly formBuilder = inject(FormBuilder);
  private readonly toastService = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly isSubmitting = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly showCurrentPassword = signal(false);
  protected readonly showNewPassword = signal(false);

  protected readonly form = this.formBuilder.nonNullable.group(
    {
      currentPassword: ['', Validators.required],
      newPassword: ['', Validators.required],
      confirmPassword: ['', Validators.required],
    },
    { validators: passwordsMatchValidator() },
  );

  protected readonly currentPasswordControl = this.form.controls.currentPassword;
  protected readonly newPasswordControl = this.form.controls.newPassword;
  protected readonly confirmPasswordControl = this.form.controls.confirmPassword;

  protected isCurrentPasswordInvalid(): boolean {
    return (
      this.currentPasswordControl.invalid &&
      (this.currentPasswordControl.dirty || this.currentPasswordControl.touched)
    );
  }

  protected isNewPasswordInvalid(): boolean {
    return (
      this.newPasswordControl.invalid &&
      (this.newPasswordControl.dirty || this.newPasswordControl.touched)
    );
  }

  protected isConfirmPasswordInvalid(): boolean {
    const touchedOrDirty = this.confirmPasswordControl.dirty || this.confirmPasswordControl.touched;
    return (
      (this.confirmPasswordControl.invalid || this.form.hasError('passwordsMismatch')) &&
      touchedOrDirty
    );
  }

  protected confirmPasswordErrorMessage(): string {
    if (this.confirmPasswordControl.hasError('required')) {
      return 'A confirmação da palavra-passe é obrigatória.';
    }
    if (this.form.hasError('passwordsMismatch')) {
      return 'A confirmação não corresponde à nova palavra-passe.';
    }
    return '';
  }

  protected toggleCurrentPasswordVisibility(): void {
    this.showCurrentPassword.update((visible) => !visible);
  }

  protected toggleNewPasswordVisibility(): void {
    this.showNewPassword.update((visible) => !visible);
  }

  protected submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.errorMessage.set(null);
    this.isSubmitting.set(true);
    const { currentPassword } = this.form.getRawValue();

    this.authService
      .changePassword(currentPassword)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.isSubmitting.set(false);
          this.form.reset();
          this.toastService.success('Palavra-passe alterada com sucesso.');
        },
        error: (error: Error) => {
          this.isSubmitting.set(false);
          this.errorMessage.set(error.message);
        },
      });
  }
}
