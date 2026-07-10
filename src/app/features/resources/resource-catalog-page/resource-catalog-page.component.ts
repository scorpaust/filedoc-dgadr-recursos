import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RoutePlaceholderComponent } from '../../../shared/components/route-placeholder/route-placeholder.component';

@Component({
  selector: 'fdr-resource-catalog-page',
  imports: [RoutePlaceholderComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <fdr-route-placeholder
      title="Catálogo de recursos"
      description="Pesquisa, filtros e listagem de vídeos e guias formativos."
      futurePhaseLabel="fase futura da via de UI"
    />
  `,
})
export class ResourceCatalogPageComponent {}
