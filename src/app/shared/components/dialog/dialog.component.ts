import { A11yModule } from '@angular/cdk/a11y';
import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  OnInit,
  input,
  output,
} from '@angular/core';
import { IconComponent } from '../icon/icon.component';

let nextDialogId = 0;

@Component({
  selector: 'fdr-dialog',
  imports: [A11yModule, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <button
      type="button"
      class="fdr-dialog-scrim"
      aria-label="Fechar diálogo"
      (click)="closed.emit()"
    ></button>
    <div
      class="fdr-dialog"
      role="dialog"
      aria-modal="true"
      cdkTrapFocus
      cdkTrapFocusAutoCapture
      [attr.aria-labelledby]="titleId"
      (keydown.escape)="closed.emit()"
    >
      <header class="fdr-dialog__header">
        <h2 class="fdr-dialog__title" [id]="titleId">{{ title() }}</h2>
        <button
          type="button"
          class="fdr-dialog__close"
          aria-label="Fechar diálogo"
          (click)="closed.emit()"
        >
          <fdr-icon name="close" />
        </button>
      </header>
      <div class="fdr-dialog__content">
        <ng-content />
      </div>
    </div>
  `,
  styleUrl: './dialog.component.scss',
})
export class DialogComponent implements OnInit, OnDestroy {
  readonly title = input.required<string>();
  readonly closed = output<void>();

  protected readonly titleId = `fdr-dialog-title-${nextDialogId++}`;

  private previouslyFocusedElement: HTMLElement | null = null;

  ngOnInit(): void {
    this.previouslyFocusedElement = document.activeElement as HTMLElement | null;
  }

  ngOnDestroy(): void {
    this.previouslyFocusedElement?.focus();
  }
}
