import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { Tip } from '../../models';

@Component({
  selector: 'fdr-tip-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <article class="fdr-tip-card">
      <span class="fdr-tip-card__marker" aria-hidden="true"></span>
      <p class="fdr-tip-card__text">{{ tip().text }}</p>
    </article>
  `,
  styleUrl: './tip-card.component.scss',
})
export class TipCardComponent {
  readonly tip = input.required<Tip>();
}
