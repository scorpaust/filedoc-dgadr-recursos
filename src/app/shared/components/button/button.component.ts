import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

export type ButtonVariant = 'primary' | 'outline' | 'ghost';
export type ButtonSize = 'md' | 'sm';

@Component({
  selector: 'fdr-button',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <button
      class="fdr-button"
      [class.fdr-button--primary]="variant() === 'primary'"
      [class.fdr-button--outline]="variant() === 'outline'"
      [class.fdr-button--ghost]="variant() === 'ghost'"
      [class.fdr-button--sm]="size() === 'sm'"
      [attr.type]="type()"
      [disabled]="disabled()"
      (click)="clicked.emit()"
    >
      <ng-content />
    </button>
  `,
  styleUrl: './button.component.scss',
})
export class ButtonComponent {
  readonly variant = input<ButtonVariant>('primary');
  readonly size = input<ButtonSize>('md');
  readonly disabled = input(false);
  readonly type = input<'button' | 'submit'>('button');
  readonly clicked = output<void>();
}
