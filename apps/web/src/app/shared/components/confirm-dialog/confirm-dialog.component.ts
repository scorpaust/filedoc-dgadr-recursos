import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ButtonComponent } from '../button/button.component';
import { DialogComponent } from '../dialog/dialog.component';

export interface ConfirmDialogData {
  readonly title: string;
  readonly message: string;
  readonly confirmLabel?: string;
  readonly cancelLabel?: string;
}

// Diálogo de confirmação genérico (Fase 8 — UI), reutilizável em qualquer ação menos
// reversível (arquivar um recurso, eliminar uma taxonomia, etc.), reaproveitando o
// `DialogComponent`/`DialogService` da Fase 1.
@Component({
  selector: 'fdr-confirm-dialog',
  imports: [DialogComponent, ButtonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <fdr-dialog [title]="data.title" (closed)="cancel()">
      <p class="fdr-confirm-dialog__message">{{ data.message }}</p>
      <div class="fdr-confirm-dialog__actions">
        <fdr-button variant="outline" (clicked)="cancel()">
          {{ data.cancelLabel ?? 'Cancelar' }}
        </fdr-button>
        <fdr-button variant="primary" (clicked)="confirm()">
          {{ data.confirmLabel ?? 'Confirmar' }}
        </fdr-button>
      </div>
    </fdr-dialog>
  `,
  styleUrl: './confirm-dialog.component.scss',
})
export class ConfirmDialogComponent {
  protected readonly data = inject<ConfirmDialogData>(DIALOG_DATA);
  private readonly dialogRef = inject(DialogRef<boolean, ConfirmDialogComponent>);

  protected confirm(): void {
    this.dialogRef.close(true);
  }

  protected cancel(): void {
    this.dialogRef.close(false);
  }
}
