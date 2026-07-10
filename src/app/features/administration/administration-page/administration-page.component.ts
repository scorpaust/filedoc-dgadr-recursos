import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RoutePlaceholderComponent } from '../../../shared/components/route-placeholder/route-placeholder.component';

@Component({
  selector: 'fdr-administration-page',
  imports: [RoutePlaceholderComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <fdr-route-placeholder
      title="Administração"
      description="Gestão de utilizadores, funções, taxonomias e auditoria."
      futurePhaseLabel="fase futura da via de UI"
    />
  `,
})
export class AdministrationPageComponent {}
