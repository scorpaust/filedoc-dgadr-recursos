import { Router } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { takeUntilDestroyed, toObservable, toSignal } from '@angular/core/rxjs-interop';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  input,
  signal,
} from '@angular/core';
import { combineLatest } from 'rxjs';
import { switchMap, tap } from 'rxjs/operators';
import { ButtonComponent } from '../../../shared/components/button/button.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { IconComponent } from '../../../shared/components/icon/icon.component';
import { SkeletonComponent } from '../../../shared/components/skeleton/skeleton.component';
import { TagComponent, TagTone } from '../../../shared/components/tag/tag.component';
import { TicketReferenceComponent } from '../../../shared/components/ticket-reference/ticket-reference.component';
import {
  TicketTimelineComponent,
  TicketTimelineEntry,
} from '../../../shared/components/ticket-timeline/ticket-timeline.component';
import { ToastService } from '../../../shared/components/toast/toast.service';
import {
  SupportTicket,
  TICKET_PRIORITY_LABELS,
  TICKET_STATUS_LABELS,
  TicketPriority,
  TicketStatus,
} from '../../../shared/models';
import {
  MAX_ATTACHMENTS_PER_MESSAGE,
  SupportTicketMockService,
} from '../data/support-ticket-mock.service';
import { TICKET_PRIORITY_TONES, TICKET_STATUS_TONES } from '../ticket-tone.util';

@Component({
  selector: 'fdr-ticket-detail-page',
  imports: [
    ReactiveFormsModule,
    ButtonComponent,
    IconComponent,
    SkeletonComponent,
    EmptyStateComponent,
    TagComponent,
    TicketReferenceComponent,
    TicketTimelineComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './ticket-detail-page.component.html',
  styleUrl: './ticket-detail-page.component.scss',
})
export class TicketDetailPageComponent {
  private readonly ticketService = inject(SupportTicketMockService);
  private readonly toastService = inject(ToastService);
  private readonly router = inject(Router);
  private readonly formBuilder = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);

  readonly id = input.required<string>();

  protected readonly maxAttachments = MAX_ATTACHMENTS_PER_MESSAGE;

  protected readonly loading = signal(true);
  private readonly refreshTrigger = signal(0);

  protected readonly ticket = toSignal(
    combineLatest([toObservable(this.id), toObservable(this.refreshTrigger)]).pipe(
      tap(() => this.loading.set(true)),
      switchMap(([id]) => this.ticketService.getMineById(id)),
      tap(() => this.loading.set(false)),
    ),
    { initialValue: undefined as SupportTicket | undefined },
  );

  protected readonly notFound = computed(() => !this.loading() && this.ticket() === undefined);

  protected readonly timelineEntries = computed<readonly TicketTimelineEntry[]>(() => {
    const ticket = this.ticket();
    if (!ticket) {
      return [];
    }
    // Filtro redundante por definição — nesta vista o serviço nunca devolve notas
    // internas — mas mantido como segunda linha de defesa (project-spec.md, secção I).
    return ticket.messages
      .filter((message) => !message.internal)
      .map((message) => ({
        id: message.id,
        kind: 'message',
        author: message.author,
        authorRole: message.authorRole,
        createdAt: message.createdAt,
        content: message.content,
        attachments: message.attachments,
      }));
  });

  protected readonly canReply = computed(() => this.ticket()?.status !== 'CLOSED');
  protected readonly canConfirmResolution = computed(() => this.ticket()?.status === 'RESOLVED');

  protected readonly isSubmittingReply = signal(false);
  protected readonly pendingAttachments = signal<readonly string[]>([]);

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

  protected onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file || this.pendingAttachments().length >= this.maxAttachments) {
      return;
    }
    this.pendingAttachments.update((files) => [...files, file.name]);
  }

  protected removePendingAttachment(index: number): void {
    this.pendingAttachments.update((files) =>
      files.filter((_, candidateIndex) => candidateIndex !== index),
    );
  }

  protected submitReply(): void {
    const ticket = this.ticket();
    if (!ticket || this.isSubmittingReply()) {
      return;
    }
    if (this.replyForm.invalid) {
      this.replyForm.markAllAsTouched();
      return;
    }

    this.isSubmittingReply.set(true);
    const { content } = this.replyForm.getRawValue();
    this.ticketService
      .addMessage(ticket.id, content, this.pendingAttachments())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.isSubmittingReply.set(false);
          this.replyForm.reset();
          this.pendingAttachments.set([]);
          this.refreshTrigger.update((n) => n + 1);
        },
        error: () => {
          this.isSubmittingReply.set(false);
          this.toastService.error('Não foi possível enviar a resposta.');
        },
      });
  }

  protected confirmResolution(): void {
    const ticket = this.ticket();
    if (!ticket) {
      return;
    }
    this.ticketService
      .confirmResolution(ticket.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.toastService.success('Pedido encerrado.');
          this.refreshTrigger.update((n) => n + 1);
        },
        error: () => this.toastService.error('Não foi possível confirmar a resolução.'),
      });
  }

  protected goToMyTickets(): void {
    this.router.navigateByUrl('/suporte');
  }
}
