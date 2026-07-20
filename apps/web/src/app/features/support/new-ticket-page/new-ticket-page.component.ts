import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  signal,
} from '@angular/core';
import { of } from 'rxjs';
import { ButtonComponent } from '../../../shared/components/button/button.component';
import { IconComponent } from '../../../shared/components/icon/icon.component';
import {
  BLOCKING_PRIORITY_WARNING,
  TICKET_CATEGORIES,
  TICKET_PRIORITY_LABELS,
  TicketCategory,
  TicketPriority,
} from '../../../shared/models';
import { ResourceMockService } from '../../resources/data/resource-mock.service';
import { CreateTicketInput } from '../data/create-ticket-input.model';
import { SupportTicketMockService } from '../data/support-ticket-mock.service';

const PRIORITIES: readonly TicketPriority[] = ['baixa', 'normal', 'alta', 'bloqueante'];

@Component({
  selector: 'fdr-new-ticket-page',
  imports: [ReactiveFormsModule, ButtonComponent, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './new-ticket-page.component.html',
  styleUrl: './new-ticket-page.component.scss',
})
export class NewTicketPageComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly resourceService = inject(ResourceMockService);
  private readonly ticketService = inject(SupportTicketMockService);
  private readonly formBuilder = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly categories = TICKET_CATEGORIES;
  protected readonly priorities = PRIORITIES;
  protected readonly priorityLabels = TICKET_PRIORITY_LABELS;
  protected readonly blockingPriorityWarning = BLOCKING_PRIORITY_WARNING;

  protected readonly isSubmitting = signal(false);
  private readonly relatedResourceRemoved = signal(false);

  private readonly preassociatedSlug = this.route.snapshot.queryParamMap.get('recurso');

  private readonly preassociatedResource = toSignal(
    this.preassociatedSlug ? this.resourceService.getBySlug(this.preassociatedSlug) : of(undefined),
    { initialValue: undefined },
  );

  protected readonly relatedResource = computed(() =>
    this.relatedResourceRemoved() ? undefined : this.preassociatedResource(),
  );

  protected readonly form = this.formBuilder.nonNullable.group({
    subject: [this.route.snapshot.queryParamMap.get('assunto') ?? '', Validators.required],
    description: ['', Validators.required],
    category: ['' as TicketCategory | '', Validators.required],
    priority: ['' as TicketPriority | '', Validators.required],
  });

  protected readonly subjectControl = this.form.controls.subject;
  protected readonly descriptionControl = this.form.controls.description;
  protected readonly categoryControl = this.form.controls.category;
  protected readonly priorityControl = this.form.controls.priority;

  private readonly priorityValue = toSignal(this.priorityControl.valueChanges, {
    initialValue: this.priorityControl.value,
  });

  protected readonly isBlockingPriority = computed(() => this.priorityValue() === 'bloqueante');

  protected isFieldInvalid(
    controlName: 'subject' | 'description' | 'category' | 'priority',
  ): boolean {
    const control = this.form.controls[controlName];
    return control.invalid && (control.dirty || control.touched);
  }

  protected removeRelatedResource(): void {
    this.relatedResourceRemoved.set(true);
  }

  protected submit(): void {
    if (this.isSubmitting()) {
      return;
    }
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.isSubmitting.set(true);
    const { subject, description, category, priority } = this.form.getRawValue();
    const input: CreateTicketInput = {
      subject,
      description,
      category: category as TicketCategory,
      priority: priority as TicketPriority,
      relatedResourceId: this.relatedResource()?.id,
    };

    this.ticketService
      .createTicket(input)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((ticket) => {
        this.router.navigate(['/suporte', ticket.id]);
      });
  }
}
