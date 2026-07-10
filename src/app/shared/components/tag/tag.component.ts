import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { Difficulty } from '../../models';

@Component({
  selector: 'fdr-tag',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span
      class="fdr-tag"
      [class.fdr-tag--iniciacao]="difficulty() === 'iniciacao'"
      [class.fdr-tag--intermedia]="difficulty() === 'intermedia'"
      [class.fdr-tag--avancada]="difficulty() === 'avancada'"
    >
      {{ label() }}
    </span>
  `,
  styleUrl: './tag.component.scss',
})
export class TagComponent {
  readonly label = input.required<string>();
  readonly difficulty = input<Difficulty | undefined>(undefined);
}
