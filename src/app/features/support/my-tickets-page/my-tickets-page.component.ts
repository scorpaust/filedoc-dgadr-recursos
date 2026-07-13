import { Router } from '@angular/router';
import { RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { tap } from 'rxjs/operators';
import { ButtonComponent } from '../../../shared/components/button/button.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import {
  SegmentedControlComponent,
  SegmentedControlOption,
} from '../../../shared/components/segmented-control/segmented-control.component';
import { SkeletonComponent } from '../../../shared/components/skeleton/skeleton.component';
import { TagComponent, TagTone } from '../../../shared/components/tag/tag.component';
import { TicketReferenceComponent } from '../../../shared/components/ticket-reference/ticket-reference.component';
import {
  SupportTicket,
  TICKET_PRIORITY_LABELS,
  TICKET_STATUS_LABELS,
  TicketPriority,
  TicketStatus,
} from '../../../shared/models';
import { SupportTicketMockService } from '../data/support-ticket-mock.service';
import { TICKET_PRIORITY_TONES, TICKET_STATUS_TONES } from '../ticket-tone.util';

type StatusFilter = TicketStatus | 'all';

const STATUS_OPTIONS: readonly SegmentedControlOption<StatusFilter>[] = [
  { value: 'all', label: 'Todos' },
  { value: 'OPEN', label: TICKET_STATUS_LABELS.OPEN },
  { value: 'IN_PROGRESS', label: TICKET_STATUS_LABELS.IN_PROGRESS },
  { value: 'WAITING_FOR_USER', label: TICKET_STATUS_LABELS.WAITING_FOR_USER },
  { value: 'RESOLVED', label: TICKET_STATUS_LABELS.RESOLVED },
  { value: 'CLOSED', label: TICKET_STATUS_LABELS.CLOSED },
];

const SKELETON_ROWS = 4;
const DATE_FORMATTER = new Intl.DateTimeFormat('pt-PT', { dateStyle: 'short' });

@Component({
  selector: 'fdr-my-tickets-page',
  imports: [
    RouterLink,
    SegmentedControlComponent,
    ButtonComponent,
    SkeletonComponent,
    EmptyStateComponent,
    TagComponent,
    TicketReferenceComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './my-tickets-page.component.html',
  styleUrl: './my-tickets-page.component.scss',
})
export class MyTicketsPageComponent {
  private readonly ticketService = inject(SupportTicketMockService);
  private readonly router = inject(Router);

  protected readonly statusOptions = STATUS_OPTIONS;
  protected readonly statusFilter = signal<StatusFilter>('all');
  protected readonly loading = signal(true);
  protected readonly skeletonPlaceholders = Array.from({ length: SKELETON_ROWS }, (_, i) => i);

  private readonly tickets = toSignal(
    this.ticketService.listMine().pipe(tap(() => this.loading.set(false))),
    { initialValue: [] as readonly SupportTicket[] },
  );

  protected readonly filteredTickets = computed<readonly SupportTicket[]>(() => {
    const status = this.statusFilter();
    const all = this.tickets();
    return status === 'all' ? all : all.filter((ticket) => ticket.status === status);
  });

  protected readonly isEmpty = computed(() => !this.loading() && this.tickets().length === 0);
  protected readonly noResultsForFilter = computed(
    () => !this.loading() && this.tickets().length > 0 && this.filteredTickets().length === 0,
  );

  protected statusLabel(status: TicketStatus): string {
    return TICKET_STATUS_LABELS[status];
  }

  protected priorityLabel(priority: TicketPriority): string {
    return TICKET_PRIORITY_LABELS[priority];
  }

  protected statusTone(status: TicketStatus): TagTone {
    return TICKET_STATUS_TONES[status];
  }

  protected priorityTone(priority: TicketPriority): TagTone {
    return TICKET_PRIORITY_TONES[priority];
  }

  protected formatDate(iso: string): string {
    return DATE_FORMATTER.format(new Date(iso));
  }

  protected onStatusFilterChange(status: StatusFilter): void {
    this.statusFilter.set(status);
  }

  protected onClearFilter(): void {
    this.statusFilter.set('all');
  }

  protected goToNewTicket(): void {
    this.router.navigateByUrl('/suporte/novo');
  }
}
