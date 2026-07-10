import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RoutePlaceholderComponent } from '../../../shared/components/route-placeholder/route-placeholder.component';

@Component({
  selector: 'fdr-tips-faq-page',
  imports: [RoutePlaceholderComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <fdr-route-placeholder
      title="Dicas & FAQ"
      description="Dicas rápidas e perguntas frequentes sobre o Filedoc."
      futurePhaseLabel="fase futura da via de UI"
    />
  `,
})
export class TipsFaqPageComponent {}
