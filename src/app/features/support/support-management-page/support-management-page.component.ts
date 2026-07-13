import { RouterLink } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { takeUntilDestroyed, toObservable, toSignal } from '@angular/core/rxjs-interop';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  signal,
} from '@angular/core';
import { Observable, combineLatest, of } from 'rxjs';
import { debounceTime, map, switchMap, tap } from 'rxjs/operators';
import { AuthService } from '../../../core/auth/auth.service';
import { ButtonComponent } from '../../../shared/components/button/button.component';
import { DialogService } from '../../../shared/components/dialog/dialog.service';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { SegmentedControlComponent } from '../../../shared/components/segmented-control/segmented-control.component';
import type { SegmentedControlOption } from '../../../shared/components/segmented-control/segmented-control.component';
import { SkeletonComponent } from '../../../shared/components/skeleton/skeleton.component';
import { TagComponent, TagTone } from '../../../shared/components/tag/tag.component';
import { TicketReferenceComponent } from '../../../shared/components/ticket-reference/ticket-reference.component';
import {
  TicketTimelineComponent,
  TicketTimelineEntry,
} from '../../../shared/components/ticket-timeline/ticket-timeline.component';
import { ToastService } from '../../../shared/components/toast/toast.service';
import {
  Resource,
  SupportTicket,
  TICKET_CATEGORIES,
  TICKET_PRIORITY_LABELS,
  TICKET_STATUS_LABELS,
  TICKET_STATUSES,
  TicketCategory,
  TicketPriority,
  TicketStatus,
} from '../../../shared/models';
import { ResourceMockService } from '../../resources/data/resource-mock.service';
import { SUPPORT_AGENTS, agentName } from '../agent.util';
import { SupportTicketMockService } from '../data/support-ticket-mock.service';
import { ResourcePickerDialogComponent } from '../resource-picker-dialog/resource-picker-dialog.component';
import { TICKET_PRIORITY_TONES, TICKET_STATUS_TONES } from '../ticket-tone.util';

type AgentStatusFilter = TicketStatus | 'all';
type ReplyMode = 'public' | 'internal';

// Chips do protótipo (Fase 7 — UI, tarefa B): exclui "Encerrado" propositadamente —
// pedidos encerrados continuam visíveis através do chip "Todos".
const STATUS_CHIP_OPTIONS: readonly SegmentedControlOption<AgentStatusFilter>[] = [
  { value: 'all', label: 'Todos' },
  { value: 'OPEN', label: TICKET_STATUS_LABELS.OPEN },
  { value: 'IN_PROGRESS', label: TICKET_STATUS_LABELS.IN_PROGRESS },
  { value: 'WAITING_FOR_USER', label: TICKET_STATUS_LABELS.WAITING_FOR_USER },
  { value: 'RESOLVED', label: TICKET_STATUS_LABELS.RESOLVED },
];

const PRIORITIES: readonly TicketPriority[] = ['baixa', 'normal', 'alta', 'bloqueante'];
const SEARCH_DEBOUNCE_MS = 250;

@Component({
  selector: 'fdr-support-management-page',
  imports: [
    RouterLink,
    ReactiveFormsModule,
    ButtonComponent,
    SegmentedControlComponent,
    SkeletonComponent,
    EmptyStateComponent,
    TagComponent,
    TicketReferenceComponent,
    TicketTimelineComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './support-management-page.component.html',
  styleUrl: './support-management-page.component.scss',
})
export class SupportManagementPageComponent {
  private readonly ticketService = inject(SupportTicketMockService);
  private readonly resourceService = inject(ResourceMockService);
  private readonly dialogService = inject(DialogService);
  private readonly toastService = inject(ToastService);
  private readonly authService = inject(AuthService);
  private readonly formBuilder = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly categories = TICKET_CATEGORIES;
  protected readonly priorities = PRIORITIES;
  protected readonly statuses = TICKET_STATUSES;
  protected readonly agents = SUPPORT_AGENTS;
  protected readonly statusChipOptions = STATUS_CHIP_OPTIONS;

  protected readonly statusFilter = signal<AgentStatusFilter>('all');
  protected readonly searchControl = this.formBuilder.nonNullable.control('');
  private readonly searchQuery = toSignal(
    this.searchControl.valueChanges.pipe(debounceTime(SEARCH_DEBOUNCE_MS)),
    { initialValue: '' },
  );

  protected readonly loading = signal(true);
  private readonly refreshTrigger = signal(0);

  protected readonly tickets = toSignal(
    combineLatest([
      toObservable(this.statusFilter),
      toObservable(this.searchQuery),
      toObservable(this.refreshTrigger),
    ]).pipe(
      tap(() => this.loading.set(true)),
      switchMap(([status, query]) =>
        this.ticketService.listAll({
          status: status === 'all' ? undefined : status,
          query,
        }),
      ),
      tap(() => this.loading.set(false)),
    ),
    { initialValue: [] as readonly SupportTicket[] },
  );

  protected readonly hasResults = computed(() => this.tickets().length > 0);

  protected readonly selectedTicketId = signal<string | undefined>(undefined);
  protected readonly selectedTicket = computed(() =>
    this.tickets().find((ticket) => ticket.id === this.selectedTicketId()),
  );

  protected readonly associatedResource = toSignal(
    toObservable(computed(() => this.selectedTicket()?.relatedResourceId)).pipe(
      switchMap((resourceId) =>
        resourceId ? this.resourceService.getRelated([resourceId]) : of([]),
      ),
      map((resources): Resource | undefined => resources[0]),
    ),
    { initialValue: undefined as Resource | undefined },
  );

  protected readonly timelineEntries = computed<readonly TicketTimelineEntry[]>(() => {
    const ticket = this.selectedTicket();
    if (!ticket) {
      return [];
    }
    return ticket.messages.map((message) => ({
      id: message.id,
      kind: message.internal ? 'internal-note' : (message.kind ?? 'message'),
      author: message.author,
      authorRole: message.authorRole,
      createdAt: message.createdAt,
      content: message.content,
      attachments: message.attachments,
    }));
  });

  protected readonly canReply = computed(() => this.selectedTicket()?.status !== 'CLOSED');
  protected readonly canResolve = computed(() => {
    const status = this.selectedTicket()?.status;
    return status !== undefined && status !== 'RESOLVED' && status !== 'CLOSED';
  });
  protected readonly canClose = computed(() => this.selectedTicket()?.status !== 'CLOSED');

  protected readonly replyMode = signal<ReplyMode>('public');
  protected readonly isSubmittingReply = signal(false);
  protected readonly replyForm = this.formBuilder.nonNullable.group({
    content: ['', Validators.required],
  });

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

  protected assigneeName(ticket: SupportTicket): string {
    return agentName(ticket.assigneeId) ?? 'Não atribuído';
  }

  protected selectTicket(ticketId: string): void {
    this.selectedTicketId.set(ticketId);
    this.replyMode.set('public');
    this.replyForm.reset();
  }

  protected onSearchClear(): void {
    this.searchControl.setValue('');
    this.statusFilter.set('all');
  }

  protected setReplyMode(mode: ReplyMode): void {
    this.replyMode.set(mode);
  }

  protected assignToMe(): void {
    const ticket = this.selectedTicket();
    const currentUser = this.authService.currentUser();
    if (!ticket || !currentUser) {
      return;
    }
    this.mutate(this.ticketService.assign(ticket.id, currentUser.id), 'Pedido atribuído a si.');
  }

  protected onAssigneeChange(event: Event): void {
    const ticket = this.selectedTicket();
    const agentId = (event.target as HTMLSelectElement).value;
    if (!ticket || !agentId) {
      return;
    }
    this.mutate(this.ticketService.assign(ticket.id, agentId), 'Pedido reatribuído.');
  }

  protected onCategoryChange(event: Event): void {
    const ticket = this.selectedTicket();
    const category = (event.target as HTMLSelectElement).value as TicketCategory;
    if (!ticket) {
      return;
    }
    this.mutate(this.ticketService.updateCategory(ticket.id, category), 'Categoria atualizada.');
  }

  protected onPriorityChange(event: Event): void {
    const ticket = this.selectedTicket();
    const priority = (event.target as HTMLSelectElement).value as TicketPriority;
    if (!ticket) {
      return;
    }
    this.mutate(this.ticketService.updatePriority(ticket.id, priority), 'Prioridade atualizada.');
  }

  protected onStatusChange(event: Event): void {
    const ticket = this.selectedTicket();
    const status = (event.target as HTMLSelectElement).value as TicketStatus;
    if (!ticket) {
      return;
    }
    this.mutate(this.ticketService.updateStatus(ticket.id, status), 'Estado atualizado.');
  }

  protected resolveTicket(): void {
    const ticket = this.selectedTicket();
    if (!ticket) {
      return;
    }
    this.mutate(this.ticketService.resolve(ticket.id), 'Pedido marcado como resolvido.');
  }

  protected closeTicket(): void {
    const ticket = this.selectedTicket();
    if (!ticket) {
      return;
    }
    this.mutate(this.ticketService.close(ticket.id), 'Pedido encerrado.');
  }

  protected openResourcePicker(): void {
    const ticket = this.selectedTicket();
    if (!ticket) {
      return;
    }
    const dialogRef = this.dialogService.open<
      Resource | undefined,
      undefined,
      ResourcePickerDialogComponent
    >(ResourcePickerDialogComponent);
    dialogRef.closed.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((resource) => {
      if (!resource) {
        return;
      }
      this.mutate(
        this.ticketService.associateResource(ticket.id, resource.id),
        'Recurso associado ao pedido.',
      );
    });
  }

  protected submitReply(): void {
    const ticket = this.selectedTicket();
    if (!ticket || this.isSubmittingReply()) {
      return;
    }
    if (this.replyForm.invalid) {
      this.replyForm.markAllAsTouched();
      return;
    }

    this.isSubmittingReply.set(true);
    const { content } = this.replyForm.getRawValue();
    const submission =
      this.replyMode() === 'internal'
        ? this.ticketService.addInternalNote(ticket.id, content)
        : this.ticketService.reply(ticket.id, content);

    submission.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.isSubmittingReply.set(false);
        this.replyForm.reset();
        this.refreshTrigger.update((n) => n + 1);
      },
      error: () => {
        this.isSubmittingReply.set(false);
        this.toastService.error('Não foi possível enviar a resposta.');
      },
    });
  }

  private mutate(source: Observable<SupportTicket>, successMessage: string): void {
    source.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.toastService.success(successMessage);
        this.refreshTrigger.update((n) => n + 1);
      },
      error: () => this.toastService.error('Não foi possível concluir a operação.'),
    });
  }
}
