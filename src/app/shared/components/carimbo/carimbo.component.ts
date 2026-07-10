import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'fdr-carimbo',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: ` <span class="fdr-carimbo">{{ label() }}</span> `,
  styleUrl: './carimbo.component.scss',
})
export class CarimboComponent {
  readonly label = input.required<string>();
}
