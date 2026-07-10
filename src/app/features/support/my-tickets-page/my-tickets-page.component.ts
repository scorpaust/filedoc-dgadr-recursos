import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RoutePlaceholderComponent } from '../../../shared/components/route-placeholder/route-placeholder.component';

@Component({
  selector: 'fdr-my-tickets-page',
  imports: [RoutePlaceholderComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <fdr-route-placeholder
      title="Suporte"
      description="Criação e acompanhamento dos meus pedidos de suporte."
      futurePhaseLabel="fase futura da via de UI"
    />
  `,
})
export class MyTicketsPageComponent {}
