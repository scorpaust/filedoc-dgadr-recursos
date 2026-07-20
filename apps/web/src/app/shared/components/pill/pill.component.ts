import { ChangeDetectionStrategy, Component, input } from '@angular/core';

export type PillTone = 'success' | 'neutral' | 'plum' | 'info' | 'warning' | 'danger';

@Component({
  selector: 'fdr-pill',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span
      class="fdr-pill"
      [class.fdr-pill--success]="tone() === 'success'"
      [class.fdr-pill--neutral]="tone() === 'neutral'"
      [class.fdr-pill--plum]="tone() === 'plum'"
      [class.fdr-pill--info]="tone() === 'info'"
      [class.fdr-pill--warning]="tone() === 'warning'"
      [class.fdr-pill--danger]="tone() === 'danger'"
    >
      <span class="fdr-pill__dot" aria-hidden="true"></span>
      {{ label() }}
    </span>
  `,
  styleUrl: './pill.component.scss',
})
export class PillComponent {
  readonly label = input.required<string>();
  readonly tone = input<PillTone>('neutral');
}
