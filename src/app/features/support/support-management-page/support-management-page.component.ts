import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RoutePlaceholderComponent } from '../../../shared/components/route-placeholder/route-placeholder.component';

@Component({
  selector: 'fdr-support-management-page',
  imports: [RoutePlaceholderComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <fdr-route-placeholder
      title="Gestão de suporte"
      description="Fila de pedidos de suporte, atribuição e resposta pela equipa de suporte."
      futurePhaseLabel="fase futura da via de UI"
    />
  `,
})
export class SupportManagementPageComponent {}
