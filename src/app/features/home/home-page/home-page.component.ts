import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RoutePlaceholderComponent } from '../../../shared/components/route-placeholder/route-placeholder.component';

@Component({
  selector: 'fdr-home-page',
  imports: [RoutePlaceholderComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <fdr-route-placeholder
      title="Início"
      description="Página inicial com destaques, recursos recentes e os meus pedidos de suporte."
      futurePhaseLabel="fase futura da via de UI"
    />
  `,
})
export class HomePageComponent {}
