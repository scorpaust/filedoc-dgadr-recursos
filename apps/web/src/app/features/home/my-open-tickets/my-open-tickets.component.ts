import { RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { SkeletonComponent } from '../../../shared/components/skeleton/skeleton.component';
import { TagComponent, TagTone } from '../../../shared/components/tag/tag.component';
import { TicketReferenceComponent } from '../../../shared/components/ticket-reference/ticket-reference.component';
import { TICKET_STATUS_LABELS, TicketStatus } from '../../../shared/models';
import { SupportTicketMockService } from '../../support/data/support-ticket-mock.service';
import { TICKET_STATUS_TONES } from '../../support/ticket-tone.util';

export const MY_OPEN_TICKETS_LIMIT = 4;

// "Os meus pedidos" (Fase 10 — UI, tarefa E): reaproveita `SupportTicketMockService.listMine`,
// mostrando apenas os pedidos que não estejam "Encerrado". Carrega de forma independente das
// restantes secções da página inicial.
@Component({
  selector: 'fdr-my-open-tickets',
  imports: [
    RouterLink,
    SkeletonComponent,
    EmptyStateComponent,
    TagComponent,
    TicketReferenceComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './my-open-tickets.component.html',
  styleUrl: './my-open-tickets.component.scss',
})
export class MyOpenTicketsComponent {
  private readonly ticketService = inject(SupportTicketMockService);

  protected readonly skeletonPlaceholders = Array.from(
    { length: MY_OPEN_TICKETS_LIMIT },
    (_, index) => index,
  );

  private readonly tickets = toSignal(this.ticketService.listMine(), { initialValue: undefined });

  protected readonly loading = computed(() => this.tickets() === undefined);
  protected readonly openTickets = computed(() =>
    (this.tickets() ?? [])
      .filter((ticket) => ticket.status !== 'CLOSED')
      .slice(0, MY_OPEN_TICKETS_LIMIT),
  );
  protected readonly isEmpty = computed(() => !this.loading() && this.openTickets().length === 0);

  protected statusLabel(status: TicketStatus): string {
    return TICKET_STATUS_LABELS[status];
  }

  protected statusTone(status: TicketStatus): TagTone {
    return TICKET_STATUS_TONES[status];
  }
}
