import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RoutePlaceholderComponent } from '../../../shared/components/route-placeholder/route-placeholder.component';

@Component({
  selector: 'fdr-content-management-page',
  imports: [RoutePlaceholderComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <fdr-route-placeholder
      title="Conteúdos"
      description="Criação, edição e publicação de recursos, dicas e perguntas frequentes."
      futurePhaseLabel="fase futura da via de UI"
    />
  `,
})
export class ContentManagementPageComponent {}
