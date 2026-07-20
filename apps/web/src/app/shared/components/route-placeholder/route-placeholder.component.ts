import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'fdr-route-placeholder',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="fdr-route-placeholder">
      <h1 class="fdr-route-placeholder__title">{{ title() }}</h1>
      @if (description()) {
        <p class="fdr-route-placeholder__description">{{ description() }}</p>
      }
      <p class="fdr-route-placeholder__phase">Conteúdo desta fase: {{ futurePhaseLabel() }}</p>
    </section>
  `,
  styleUrl: './route-placeholder.component.scss',
})
export class RoutePlaceholderComponent {
  readonly title = input.required<string>();
  readonly futurePhaseLabel = input.required<string>();
  readonly description = input<string | undefined>(undefined);
}
