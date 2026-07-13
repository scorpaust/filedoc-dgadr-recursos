import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { CarimboComponent } from '../carimbo/carimbo.component';

// Apresenta a referência de um pedido de suporte de forma consistente em todos os
// ecrãs (lista, criação, detalhe) — reaproveita o CarimboComponent da Fase 1.
@Component({
  selector: 'fdr-ticket-reference',
  imports: [CarimboComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: ` <fdr-carimbo [label]="reference()" /> `,
})
export class TicketReferenceComponent {
  readonly reference = input.required<string>();
}
