import { DialogRef } from '@angular/cdk/dialog';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { ButtonComponent } from '../../../shared/components/button/button.component';
import { DialogComponent } from '../../../shared/components/dialog/dialog.component';
import { AppUser, USER_ROLE_LABELS, UserRole } from '../../../shared/models';
import { UserService } from '../data/user.service';

const ALL_ROLES: readonly UserRole[] = ['EMPLOYEE', 'CONTENT_EDITOR', 'SUPPORT_AGENT', 'ADMIN'];

// Diálogo de criação de conta (Fase 9 — UI, tarefa B; ligado à API real na Fase 8 —
// Integração). Nunca pede palavra-passe: a API gera uma palavra-passe temporária, nunca
// devolvida ao cliente — sem fluxo de entrega/reposição nesta fase (ver `UserService`), a
// conta só fica utilizável depois de uma fase futura que resolva essa entrega.
@Component({
  selector: 'fdr-create-user-dialog',
  imports: [ReactiveFormsModule, DialogComponent, ButtonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './create-user-dialog.component.html',
  styleUrl: './create-user-dialog.component.scss',
})
export class CreateUserDialogComponent {
  private readonly dialogRef = inject(DialogRef<AppUser | undefined, CreateUserDialogComponent>);
  private readonly userService = inject(UserService);
  private readonly formBuilder = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly roleOptions = ALL_ROLES;
  protected readonly roleLabels = USER_ROLE_LABELS;
  protected readonly selectedRoles = signal<readonly UserRole[]>([]);
  protected readonly rolesTouched = signal(false);
  protected readonly isSubmitting = signal(false);
  protected readonly errorMessage = signal<string | null>(null);

  protected readonly form = this.formBuilder.nonNullable.group({
    name: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    career: ['', Validators.required],
  });

  protected readonly nameControl = this.form.controls.name;
  protected readonly emailControl = this.form.controls.email;
  protected readonly careerControl = this.form.controls.career;

  protected isRoleSelected(role: UserRole): boolean {
    return this.selectedRoles().includes(role);
  }

  protected toggleRole(role: UserRole): void {
    this.rolesTouched.set(true);
    this.selectedRoles.update((current) =>
      current.includes(role)
        ? current.filter((candidate) => candidate !== role)
        : [...current, role],
    );
  }

  protected hasNoRoles(): boolean {
    return this.rolesTouched() && this.selectedRoles().length === 0;
  }

  protected submit(): void {
    this.rolesTouched.set(true);
    if (this.form.invalid || this.selectedRoles().length === 0) {
      this.form.markAllAsTouched();
      return;
    }

    this.errorMessage.set(null);
    this.isSubmitting.set(true);
    const { name, email, career } = this.form.getRawValue();

    this.userService
      .create({ name, email, career, roles: this.selectedRoles() })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (user) => {
          this.isSubmitting.set(false);
          this.dialogRef.close(user);
        },
        error: (error: Error) => {
          this.isSubmitting.set(false);
          this.errorMessage.set(error.message);
        },
      });
  }

  protected cancel(): void {
    this.dialogRef.close(undefined);
  }
}
