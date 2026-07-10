import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RoutePlaceholderComponent } from '../../../shared/components/route-placeholder/route-placeholder.component';

@Component({
  selector: 'fdr-resource-detail-page',
  imports: [RoutePlaceholderComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <fdr-route-placeholder
      title="Detalhe do recurso"
      [description]="'Recurso: ' + slug()"
      futurePhaseLabel="fase futura da via de UI"
    />
  `,
})
export class ResourceDetailPageComponent {
  readonly slug = input.required<string>();
}
