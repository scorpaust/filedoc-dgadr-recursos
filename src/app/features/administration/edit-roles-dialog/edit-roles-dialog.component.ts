import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { UserMockService } from '../../../core/auth/user-mock.service';
import { ButtonComponent } from '../../../shared/components/button/button.component';
import { DialogComponent } from '../../../shared/components/dialog/dialog.component';
import { AppUser, USER_ROLE_LABELS, UserRole } from '../../../shared/models';

const ALL_ROLES: readonly UserRole[] = ['EMPLOYEE', 'CONTENT_EDITOR', 'SUPPORT_AGENT', 'ADMIN'];

export interface EditRolesDialogData {
  readonly user: AppUser;
}

// Diálogo de edição de funções (Fase 9 — UI, tarefa B), com seleção múltipla por checkboxes,
// nunca um único `select` (fase-9-ui-administracao.md). A submissão chama diretamente o
// `UserMockService`, para poder mostrar aqui a mensagem de bloqueio do último `ADMIN` sem
// fechar o diálogo, tal como a exigida em `assignRoles`.
@Component({
  selector: 'fdr-edit-roles-dialog',
  imports: [DialogComponent, ButtonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './edit-roles-dialog.component.html',
  styleUrl: './edit-roles-dialog.component.scss',
})
export class EditRolesDialogComponent {
  private readonly data = inject<EditRolesDialogData>(DIALOG_DATA);
  private readonly dialogRef = inject(DialogRef<AppUser | undefined, EditRolesDialogComponent>);
  private readonly userMockService = inject(UserMockService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly user = this.data.user;
  protected readonly roleOptions = ALL_ROLES;
  protected readonly roleLabels = USER_ROLE_LABELS;
  protected readonly selectedRoles = signal<readonly UserRole[]>(this.data.user.roles);
  protected readonly submitted = signal(false);
  protected readonly isSubmitting = signal(false);
  protected readonly errorMessage = signal<string | null>(null);

  protected isRoleSelected(role: UserRole): boolean {
    return this.selectedRoles().includes(role);
  }

  protected toggleRole(role: UserRole): void {
    this.selectedRoles.update((current) =>
      current.includes(role)
        ? current.filter((candidate) => candidate !== role)
        : [...current, role],
    );
  }

  protected hasNoRoles(): boolean {
    return this.submitted() && this.selectedRoles().length === 0;
  }

  protected submit(): void {
    this.submitted.set(true);
    if (this.selectedRoles().length === 0) {
      return;
    }

    this.errorMessage.set(null);
    this.isSubmitting.set(true);

    this.userMockService
      .assignRoles(this.user.id, this.selectedRoles())
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
