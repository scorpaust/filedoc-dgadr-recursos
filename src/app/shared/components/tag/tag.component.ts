import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { Difficulty } from '../../models';

export type TagTone = 'neutral' | 'info' | 'warning' | 'danger' | 'success' | 'plum';

@Component({
  selector: 'fdr-tag',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span
      class="fdr-tag"
      [class.fdr-tag--iniciacao]="difficulty() === 'iniciacao'"
      [class.fdr-tag--intermedia]="difficulty() === 'intermedia'"
      [class.fdr-tag--avancada]="difficulty() === 'avancada'"
      [class.fdr-tag--tone-neutral]="tone() === 'neutral'"
      [class.fdr-tag--tone-info]="tone() === 'info'"
      [class.fdr-tag--tone-warning]="tone() === 'warning'"
      [class.fdr-tag--tone-danger]="tone() === 'danger'"
      [class.fdr-tag--tone-success]="tone() === 'success'"
      [class.fdr-tag--tone-plum]="tone() === 'plum'"
    >
      {{ label() }}
    </span>
  `,
  styleUrl: './tag.component.scss',
})
export class TagComponent {
  readonly label = input.required<string>();
  readonly difficulty = input<Difficulty | undefined>(undefined);
  // Tom genérico (reaproveitando os tokens de tone já definidos em _themes.scss),
  // usado por outros consumidores do Tag além dos recursos (ex. estado/prioridade de um pedido de suporte).
  readonly tone = input<TagTone | undefined>(undefined);
}
