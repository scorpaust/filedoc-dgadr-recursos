import { ChangeDetectionStrategy, Component, input, model } from '@angular/core';

@Component({
  selector: 'fdr-chip',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <button
      type="button"
      class="fdr-chip"
      [class.fdr-chip--selected]="selected()"
      [attr.aria-pressed]="selected()"
      (click)="selected.set(!selected())"
    >
      {{ label() }}
    </button>
  `,
  styleUrl: './chip.component.scss',
})
export class ChipComponent {
  readonly label = input.required<string>();
  readonly selected = model(false);
}
